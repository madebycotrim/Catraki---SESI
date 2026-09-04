import { MiddlewareHandler } from 'hono';
import { sha256 } from '../../src/lib/crypto.ts';

/**
 * Middleware de cabeçalhos estritos de segurança (OWASP Top 10 + LGPD)
 */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  // Previne MIME sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Previne Clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Proteção XSS legada em navegadores antigos
  c.header('X-XSS-Protection', '1; mode=block');

  // HSTS Estrito com Preload (2 anos)
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Referrer restrito
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy restrita para saúde
  c.header('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');

  // Content Security Policy
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://catraki.com.br https://*.catraki.com.br https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://*.cloudflare.com blob:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://catraki.com.br https://*.catraki.com.br https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://*.cloudflare.com blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://catraki.com.br https://*.catraki.com.br https://challenges.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://*.cloudflare.com blob: data:; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none';"
  );
};

// ============================================================================
// MIDDLEWARE DE LOG DE ACESSO — MARCO CIVIL DA INTERNET (Art. 15, Lei 12.965/2014)
// Registra cada requisição HTTP com IP, User-Agent, endpoint, método e status.
// Retenção: 180 dias (6 meses regulatórios).
// Gravação assíncrona via ctx.waitUntil — NÃO impacta latência da resposta.
// ============================================================================

/**
 * Middleware que grava automaticamente cada requisição na tabela application_access_logs.
 * Deve ser registrado GLOBALMENTE no roteador principal (após securityHeaders).
 *
 * Conformidade: Marco Civil da Internet Art. 15 (Lei 12.965/2014) — retenção mínima 6 meses.
 */
export const accessLogger: MiddlewareHandler = async (c, next) => {
  await next();

  // Execução assíncrona — não bloqueia a resposta ao cliente
  const ctx = c.executionCtx as ExecutionContext | undefined;
  if (!ctx?.waitUntil) return;

  ctx.waitUntil((async () => {
    try {
      const db = (c.env as any)?.DB as D1Database | undefined;
      if (!db) return;

      // Captura dados da requisição
      const ip = c.req.header('cf-connecting-ip')
        || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        || '0.0.0.0';
      const userAgent = c.req.header('user-agent') || 'Desconhecido';
      const endpointPath = new URL(c.req.url).pathname;
      const httpMethod = c.req.method;
      const statusCode = c.res.status;

      // Hash do token de sessão (se presente) — nunca armazenamos o token em si
      const authHeader = c.req.header('authorization') || '';
      const sessionTokenRaw = authHeader.replace(/^Bearer\s+/i, '').trim();
      const sessionTokenHash = sessionTokenRaw ? await sha256(sessionTokenRaw) : null;

      // Gera ID único para o log
      const logId = `ACC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.prepare(
        `INSERT INTO application_access_logs
          (id, ip_address, user_agent, endpoint_path, http_method, status_code, session_token_hash, retention_until, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+180 days'), datetime('now'))`
      ).bind(logId, ip, userAgent, endpointPath, httpMethod, statusCode, sessionTokenHash).run();
    } catch {
      // Falha silenciosa — log de acesso nunca deve interromper o fluxo principal
    }
  })());
};

