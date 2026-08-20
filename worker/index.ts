import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { securityHeaders } from './middleware/security.ts';
import { signerRouter } from './routes/signer.ts';
import { adminRouter } from './routes/admin.ts';
import { publicRouter } from './routes/public.ts';
import { handleScheduled } from './crons/index.ts';
import type { Env } from '../src/lib/types.ts';

const app = new Hono<{ Bindings: Env }>();

// 1. Middlewares Globais de Segurança
app.use('*', securityHeaders);

// 2. CORS Seguro
app.use('*', cors({
  origin: (origin) => {
    // Em produção: restrito aos domínios institucionais permitidos
    if (!origin || origin.includes('localhost') || origin.endsWith('.sesi.org.br') || origin.endsWith('.workers.dev')) {
      return origin || '*';
    }
    return 'https://saude.sesi.org.br';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'CF-Turnstile-Token'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
}));

// 3. Rotas da Aplicação
app.route('/api/signer', signerRouter);
app.route('/api/admin', adminRouter);
app.route('/api/public', publicRouter);

// 4. Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'SESI Saúde — Sistema de Assinatura Eletrônica de Procedimentos Médicos',
    legal_standard: 'Assinatura Eletrônica Avançada (Decreto Federal nº 10.543/2020)',
    lgpd_compliance: 'Art. 11 (Dado Sensível de Saúde) c/c Art. 14 (Menores de 18 Anos)',
    timestamp: new Date().toISOString(),
  });
});

// 5. Tratamento de Rota Não Encontrada (404)
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Recurso não encontrado na API do SESI Saúde.',
    code: 'NOT_FOUND',
  }, 404);
});

// 6. Tratador Global de Erros (Sem vazamento de stack trace ou dados internos do SQLite)
app.onError((err, c) => {
  console.error('[WORKER_ERROR]', {
    message: err.message,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  return c.json({
    success: false,
    error: 'Ocorreu um erro interno ao processar a solicitação. Por favor, tente novamente.',
    code: 'INTERNAL_SERVER_ERROR',
  }, 500);
});

// Exportação para o Cloudflare Workers (Fetch Handler + Scheduled Cron Handler)
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
