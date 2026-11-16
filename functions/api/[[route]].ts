import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { securityHeaders, accessLogger } from '../middleware/security.ts';
import { requireAuth } from '../middleware/auth.ts';
import { signerRouter } from '../routes/signer.ts';
import { adminRouter } from '../routes/admin.ts';
import { publicRouter } from '../routes/public.ts';
import { authMicrosoftRouter } from '../routes/auth-microsoft.ts';
import { sendTransactionalEmail } from '../utils/email.ts';
import { handleScheduled } from '../crons/index.ts';
import { constantTimeEqual } from '../../src/lib/crypto.ts';
import { escapeHtml } from '../../src/lib/email-templates.ts';
import type { Env } from '../../src/lib/types.ts';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// 1. Middlewares Globais de Segurança e Conformidade Regulatória (Marco Civil Art. 15)
app.use('*', securityHeaders);
app.use('*', accessLogger);

// 2. CORS Restrito de Produção (Proteção contra CSRF e requisições de origens não autorizadas)
const ALLOWED_ORIGINS = new Set([
  'https://saudeemmovimento.vercel.app',
  'https://catraki---sem.pages.dev',
  'https://catraki.com.br',
  'https://www.catraki.com.br',
  'https://catraki---sesi.pages.dev',
]);

const DEV_LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
]);

function isOriginAllowed(origin: string, appEnv?: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  const isDev = appEnv === 'development' || appEnv === 'test';
  if (isDev && DEV_LOCAL_ORIGINS.has(origin)) return true;

  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === 'saudeemmovimento.vercel.app' || host.endsWith('.saudeemmovimento.vercel.app')) return true;
    if (host === 'catraki---sem.pages.dev' || host.endsWith('.catraki---sem.pages.dev')) return true;
    if (host === 'catraki.com.br' || host.endsWith('.catraki.com.br')) return true;
    if (host === 'catraki---sesi.pages.dev' || host.endsWith('.catraki---sesi.pages.dev')) return true;
    if (isDev && (host === 'localhost' || host === '127.0.0.1')) return true;
  } catch {
    return false;
  }
  return false;
}

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return 'https://catraki.com.br';
      if (isOriginAllowed(origin, c.env?.APP_ENV)) {
        return origin;
      }
      return 'https://catraki.com.br';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'CF-Turnstile-Token', 'x-api-key', 'apikey', 'Prefer'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

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

    const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';
    const nowIso = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const emailResult = await sendTransactionalEmail(c.env, {
      to: emailDestino,
      subject: `Escola Cidadã — Teste de Disparo de E-mail (${nowIso})`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="border-bottom: 2px solid #034b7f; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #034b7f; margin: 0; font-size: 18px;">Escola Cidadã — Diagnóstico de Comunicação</h2>
          <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Teste de Entrega de E-mail — Plataforma Catraki</span>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Este é um e-mail de teste disparado pelo <strong>Painel Gestor do Catraki</strong>.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 18px 0;">
          <strong style="color: #166534; font-size: 14px;">Status: Serviço de E-mail Conectado e Operacional ✓</strong>
          <p style="color: #15803d; font-size: 12px; margin: 6px 0 0;">Remetente: ${escapeHtml(fromAddress)} | Data/Hora: ${escapeHtml(nowIso)}</p>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">Se você recebeu esta mensagem, o envio de códigos de confirmação para os pais está operando normalmente.</p>
      </div>`,
    });

    const latencyMs = Date.now() - startTime;
    if (emailResult.sent) {
      return c.json({
        success: true,
        provider: emailResult.provider,
        recipient: emailDestino,
        latency_ms: latencyMs,
        message: `E-mail de teste entregue com sucesso para ${emailDestino} via ${emailResult.provider} (${latencyMs}ms).`,
      });
    }

    return c.json({
      success: false,
      provider: emailResult.provider,
      latency_ms: latencyMs,
      error: 'Falha no envio pelos provedores configurados.',
    }, 502);
  } catch (err: any) {
    console.error('[SEND_TEST_EMAIL_ERROR]', err?.message || err);
    return c.json({
      success: false,
      latency_ms: Date.now() - startTime,
      error: 'Erro de comunicação ao disparar e-mail.',
    }, 500);
  }
});

// 4b. Trigger HTTP protegido para rotinas agendadas (LGPD / Retenção / Integridade)
// Como Cloudflare Pages Functions não executam Cron Triggers nativos, um Worker/Scheduler externo chama este endpoint com x-cron-secret.
app.post('/internal/cron', async (c) => {
  const expectedSecret = c.env.CRON_SECRET;
  const providedSecret = c.req.header('x-cron-secret') || '';
  if (!expectedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return c.json({ success: false, error: 'Não autorizado.' }, 401);
  }

  await handleScheduled(c.env);
  return c.json({ success: true, executed_at: new Date().toISOString() });
});

// 5. Health Check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Plataforma Catraki — Assinatura Eletrônica (Cloudflare Pages Functions)',
    legal_standard: 'Assinatura Eletrônica (Art. 10, § 2º da MP 2.200-2/2001 c/c Lei nº 14.063/2020)',
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
