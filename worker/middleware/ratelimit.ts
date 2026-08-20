import { MiddlewareHandler } from 'hono';
import type { Env } from '../../src/lib/types.ts';

interface RateLimitOptions {
  limit: number; // Máximo de requisições
  windowSeconds: number; // Janela de tempo em segundos
  keyPrefix?: string;
}

/**
 * Middleware de Rate Limiting baseado em Cloudflare KV com chave composta (IP + Token/Endpoint)
 */
export function rateLimiter(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const kv = c.env.KV_RATE_LIMIT;
    if (!kv) {
      // Fallback gracioso se KV não estiver disponível localmente
      return await next();
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const path = c.req.path;
    const bodyToken = c.req.query('token') || '';
    const prefix = options.keyPrefix || 'rl';

    // Chave composta para não penalizar redes compartilhadas injustamente
    const rateLimitKey = `${prefix}:${ip}:${path}:${bodyToken}`;

    try {
      const currentCountStr = await kv.get(rateLimitKey);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      if (currentCount >= options.limit) {
        return c.json(
          {
            success: false,
            error: 'Muitas tentativas em curto período. Por favor, aguarde alguns minutos antes de tentar novamente.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          429
        );
      }

      // Incrementa contador no KV
      await kv.put(rateLimitKey, (currentCount + 1).toString(), {
        expirationTtl: options.windowSeconds,
      });

      c.header('X-RateLimit-Limit', options.limit.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, options.limit - (currentCount + 1)).toString());
    } catch {
      // Em caso de instabilidade pontual do KV, permite continuar
    }

    await next();
  };
}
