import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { securityHeaders } from '../middleware/security.ts';
import { requireAuth } from '../middleware/auth.ts';
import { signerRouter } from '../routes/signer.ts';
import { adminRouter } from '../routes/admin.ts';
import { publicRouter } from '../routes/public.ts';
import { authMicrosoftRouter } from '../routes/auth-microsoft.ts';
import type { Env } from '../../src/lib/types.ts';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// 1. Middlewares Globais de Segurança
app.use('*', securityHeaders);

// 2. CORS Restrito e Seguro (OWASP Top 10)
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return 'https://www.catraki.com.br';

    // Origens locais permitidas em desenvolvimento
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }

    // Domínios institucionais oficiais autorizados
    if (
      origin === 'https://catraki.com.br' ||
      origin === 'https://www.catraki.com.br' ||
      origin.endsWith('.catraki.com.br') ||
      origin === 'https://catraki-sesi.pages.dev' ||
      origin === 'https://catraki.pages.dev'
    ) {
      return origin;
    }

    return 'https://www.catraki.com.br';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'CF-Turnstile-Token'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
}));

// 3. Rotas da Aplicação
app.route('/auth', authMicrosoftRouter);
app.route('/signer', signerRouter);
app.route('/admin', adminRouter);
app.route('/public', publicRouter);

// 4. Rota Administrativa de Diagnóstico de Envio de E-mail (Protegida por Autenticação Master)
app.post('/send-test-email', requireAuth(['admin_master']), async (c) => {
  const startTime = Date.now();
  try {
    const { emailDestino } = await c.req.json<{ emailDestino: string }>();

    if (!emailDestino || !/\S+@\S+\.\S+/.test(emailDestino)) {
      return c.json({ success: false, error: 'E-mail de destino inválido.' }, 400);
    }

    const resendApiKey = (c.env as any).RESEND_API_KEY;
    const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';
    const nowIso = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // 1. Envio Oficial de Teste via Resend API
    if (resendApiKey) {
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [emailDestino],
          subject: `Escola Cidadã — Teste de Disparo de E-mail (${nowIso})`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
            <div style="border-bottom: 2px solid #034b7f; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #034b7f; margin: 0; font-size: 18px;">Escola Cidadã — Diagnóstico de Comunicação</h2>
              <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Teste de Entrega de E-mail — Plataforma Catraki</span>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Este é um e-mail de teste disparado pelo <strong>Painel Gestor do Catraki</strong>.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 18px 0;">
              <strong style="color: #166534; font-size: 14px;">Status: Servidor Resend Conectado e Operacional ✓</strong>
              <p style="color: #15803d; font-size: 12px; margin: 6px 0 0;">Remetente: ${fromAddress} | Data/Hora: ${nowIso}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">Se você recebeu esta mensagem, o envio de códigos de confirmação para os pais está operando com entrega imediata e alta reputação.</p>
          </div>`,
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (resendResp.ok) {
        return c.json({
          success: true,
          provider: 'Resend API',
          recipient: emailDestino,
          latency_ms: latencyMs,
          message: `E-mail de teste entregue com sucesso para ${emailDestino} via Resend (${latencyMs}ms).`,
        });
      } else {
        const errorText = await resendResp.text();
        return c.json({
          success: false,
          provider: 'Resend API',
          latency_ms: latencyMs,
          error: 'Falha no envio pelo Resend. Verifique a API Key e se o domínio está verificado.',
          details: errorText,
        }, 502);
      }
    }

    // 2. Envio via MailChannels (Fallback)
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: emailDestino }] }],
        from: {
          email: 'autorizacoes@catraki.com.br',
          name: 'Escola Cidadã — Saúde em Movimento',
        },
        subject: `Escola Cidadã — Teste de Disparo de E-mail (${nowIso})`,
        content: [{
          type: 'text/html',
          value: `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
            <h2 style="color: #034b7f; margin-top: 0;">Escola Cidadã — Diagnóstico de Comunicação</h2>
            <p style="color: #334155; font-size: 14px;">Este é um e-mail de teste disparado pelo <strong>Painel Gestor do Catraki</strong>.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin: 16px 0;">
              <strong style="color: #166534; font-size: 14px;">Status: Servidor de E-mail Conectado e Operacional ✓</strong>
              <p style="color: #15803d; font-size: 12px; margin: 4px 0 0;">Provedor: MailChannels (Cloudflare) | Data/Hora: ${nowIso}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">Se você recebeu esta mensagem, o envio de códigos de confirmação para os pais está funcionando normalmente.</p>
          </div>`,
        }],
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (response.ok) {
      return c.json({
        success: true,
        provider: 'MailChannels (Cloudflare)',
        recipient: emailDestino,
        latency_ms: latencyMs,
        message: `E-mail de teste entregue com sucesso para ${emailDestino} via MailChannels (${latencyMs}ms).`,
      });
    } else {
      const errorText = await response.text();
      return c.json({
        success: false,
        provider: 'MailChannels',
        latency_ms: latencyMs,
        error: 'Falha na entrega pelo MailChannels',
        details: errorText,
      }, 502);
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return c.json({
      success: false,
      latency_ms: latencyMs,
      error: 'Erro de comunicação ao disparar e-mail.',
      details: err.message,
    }, 500);
  }
});

// 5. Health Check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Plataforma Catraki — Assinatura Eletrônica (Cloudflare Pages Functions)',
    legal_standard: 'Assinatura Eletrônica Avançada (Art. 4º, II da Lei nº 14.063/2020 e Art. 10, § 2º da MP 2.200-2/2001)',
    lgpd_compliance: 'Art. 11, I c/c Art. 14, § 1º (Menores de 18 Anos)',
    timestamp: new Date().toISOString(),
  });
});

// 6. Tratamento de Rota Não Encontrada (404)
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Recurso não encontrado na API da plataforma Catraki.',
    code: 'NOT_FOUND',
  }, 404);
});

// 7. Tratador Global de Erros
app.onError((err, c) => {
  console.error('[PAGES_FUNCTION_ERROR]', {
    message: err.message,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  return c.json({
    success: false,
    error: 'Ocorreu um erro interno ao processar a solicitação.',
    code: 'INTERNAL_SERVER_ERROR',
  }, 500);
});

// Exportação para o Cloudflare Pages Functions
export const onRequest = handle(app);
