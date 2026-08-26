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

// ─────────────────────────────────────────────────────────────────────────────
// OTP BRUTE-FORCE GUARD (Rate Limit por Documento — Anti Força Bruta)
// Bloqueia tentativas de OTP por documentId no KV com TTL de 15 minutos.
// Independente de IP (resiste a mudanças de rede / VPN do atacante).
// Conformidade: Art. 10, MP 2.200-2/2001 (provas de autoria e autenticidade).
// ─────────────────────────────────────────────────────────────────────────────

const OTP_BLOCK_TTL_SECONDS = 900; // 15 minutos
const OTP_BLOCK_KEY_PREFIX = 'otp_block';

/**
 * Verifica se o documentId está temporariamente bloqueado por excesso de erros OTP.
 * Retorna null se livre, ou { blockedUntil: string, retryAfterSeconds: number } se bloqueado.
 */
export async function checkOtpBruteForceBlock(
  kv: KVNamespace,
  documentId: string
): Promise<{ blockedUntil: string; retryAfterSeconds: number } | null> {
  try {
    const key = `${OTP_BLOCK_KEY_PREFIX}:${documentId}`;
    const blockedAtStr = await kv.get(key);
    if (!blockedAtStr) return null;

    const blockedAt = parseInt(blockedAtStr, 10);
    const unblockAt = blockedAt + OTP_BLOCK_TTL_SECONDS * 1000;
    const now = Date.now();

    if (now < unblockAt) {
      const retryAfterSeconds = Math.ceil((unblockAt - now) / 1000);
      return {
        blockedUntil: new Date(unblockAt).toISOString(),
        retryAfterSeconds,
      };
    }

    // Bloco expirou — limpa a chave
    await kv.delete(key).catch(() => {});
    return null;
  } catch {
    return null; // Falha silenciosa — não bloqueia o fluxo em instabilidade do KV
  }
}

/**
 * Grava um bloqueio de 15 minutos para o documentId no KV.
 * Chamado após o 3º erro consecutivo de OTP.
 */
export async function setOtpBruteForceBlock(kv: KVNamespace, documentId: string): Promise<void> {
  try {
    const key = `${OTP_BLOCK_KEY_PREFIX}:${documentId}`;
    await kv.put(key, Date.now().toString(), { expirationTtl: OTP_BLOCK_TTL_SECONDS });
  } catch {
    // Falha silenciosa — o bloqueio no DB ainda protege
  }
}

/**
 * Remove o bloqueio KV após um OTP bem-sucedido.
 */
export async function clearOtpBruteForceBlock(kv: KVNamespace, documentId: string): Promise<void> {
  try {
    await kv.delete(`${OTP_BLOCK_KEY_PREFIX}:${documentId}`);
  } catch {
    // Falha silenciosa
  }
}
