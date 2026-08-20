import { MiddlewareHandler } from 'hono';

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

  // Content Security Policy restritivo (sem inline inseguro)
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none';"
  );
};
