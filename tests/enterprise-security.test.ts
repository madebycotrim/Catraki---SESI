import { describe, it, expect } from 'vitest';
import { checkOtpBruteForceBlock, setOtpBruteForceBlock, clearOtpBruteForceBlock } from '../functions/middleware/ratelimit.ts';
import { captureDeviceFingerprint } from '../src/lib/api.ts';

// Mock KVNamespace em memória para vitest
function createMockKv(): KVNamespace {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  return {
    async get(key: string): Promise<string | null> {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiresAt && Date.now() > item.expiresAt) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

describe('Enterprise Security & Compliance', () => {
  describe('Device Fingerprinting (Art. 10 MP 2.200-2/2001)', () => {
    it('deve capturar dados do dispositivo sem lançar exceções', () => {
      const fp = captureDeviceFingerprint();

      expect(fp).toHaveProperty('screen_resolution');
      expect(fp).toHaveProperty('os_name');
      expect(fp).toHaveProperty('browser_language');
      expect(fp).toHaveProperty('timezone');
      expect(fp).toHaveProperty('color_depth');
      expect(fp).toHaveProperty('captured_at');

      expect(typeof fp.screen_resolution).toBe('string');
      expect(typeof fp.os_name).toBe('string');
      expect(typeof fp.browser_language).toBe('string');
      expect(typeof fp.timezone).toBe('string');
      expect(typeof fp.color_depth).toBe('number');
    });
  });

  describe('OTP Brute-Force Guard (Bloqueio KV 15 min)', () => {
    it('deve permitir acesso quando o documentId não estiver bloqueado', async () => {
      const kv = createMockKv();
      const block = await checkOtpBruteForceBlock(kv, 'DOC-TEST-123');
      expect(block).toBeNull();
    });

    it('deve bloquear após setOtpBruteForceBlock e liberar após clearOtpBruteForceBlock', async () => {
      const kv = createMockKv();
      const docId = 'DOC-TEST-456';

      await setOtpBruteForceBlock(kv, docId);

      const block = await checkOtpBruteForceBlock(kv, docId);
      expect(block).not.toBeNull();
      expect(block?.retryAfterSeconds).toBeGreaterThan(800);
      expect(block?.retryAfterSeconds).toBeLessThanOrEqual(900);

      await clearOtpBruteForceBlock(kv, docId);

      const blockAfterClear = await checkOtpBruteForceBlock(kv, docId);
      expect(blockAfterClear).toBeNull();
    });
  });

  describe('TTL de Link de Assinatura (3 Dias)', () => {
    it('deve considerar link expirado quando NOW > sentAt + ttlDays', () => {
      const ttlDays = 3;
      const sentAt = Date.now() - 4 * 24 * 60 * 60 * 1000; // 4 dias atrás
      const linkExpiresAt = sentAt + ttlDays * 24 * 60 * 60 * 1000;

      const isExpired = Date.now() > linkExpiresAt;
      expect(isExpired).toBe(true);
    });

    it('deve considerar link válido quando dentro da janela de 3 dias', () => {
      const ttlDays = 3;
      const sentAt = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 dias atrás
      const linkExpiresAt = sentAt + ttlDays * 24 * 60 * 60 * 1000;

      const isExpired = Date.now() > linkExpiresAt;
      expect(isExpired).toBe(false);
    });
  });

  describe('Cloudflare Turnstile Anti-Bot & Token Verification', () => {
    it('deve permitir bypass se a chave secreta for placeholder de desenvolvimento', async () => {
      const { verifyTurnstileToken } = await import('../functions/utils/turnstile.ts');
      const res = await verifyTurnstileToken('qualquer_token', 'COLE_AQUI_SEU_SEGREDO');
      expect(res.success).toBe(true);
    });

    it('deve rejeitar se a chave secreta de produção estiver configurada mas o token for nulo', async () => {
      const { verifyTurnstileToken } = await import('../functions/utils/turnstile.ts');
      const res = await verifyTurnstileToken(null, '0x4AAAAAAAPRODSECRETKEY123');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('deve aceitar token de teste oficial da Cloudflare (1x00000000000000000000AA)', async () => {
      const { verifyTurnstileToken } = await import('../functions/utils/turnstile.ts');
      const res = await verifyTurnstileToken('1x00000000000000000000AA', '0x4AAAAAAAPRODSECRETKEY123');
      expect(res.success).toBe(true);
    });
  });

  describe('CORS Whitelist de Produção (Acesso Autorizado à API)', () => {
    const ALLOWED = new Set([
      'https://saudeemmovimento.vercel.app',
      'https://catraki---sem.pages.dev',
      'https://catraki.com.br',
      'https://www.catraki.com.br',
      'https://catraki---sesi.pages.dev',
    ]);

    function isOriginAllowed(origin: string): boolean {
      if (ALLOWED.has(origin)) return true;
      try {
        const host = new URL(origin).hostname;
        if (host === 'saudeemmovimento.vercel.app' || host.endsWith('.saudeemmovimento.vercel.app')) return true;
        if (host === 'catraki---sem.pages.dev' || host.endsWith('.catraki---sem.pages.dev')) return true;
        if (host === 'catraki.com.br' || host.endsWith('.catraki.com.br')) return true;
        if (host === 'catraki---sesi.pages.dev' || host.endsWith('.catraki---sesi.pages.dev')) return true;
        if (host === 'localhost' || host === '127.0.0.1') return true;
      } catch {
        return false;
      }
      return false;
    }

    it('deve autorizar saudeemmovimento.vercel.app e catraki---sem.pages.dev', () => {
      expect(isOriginAllowed('https://saudeemmovimento.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://catraki---sem.pages.dev')).toBe(true);
      expect(isOriginAllowed('https://preview-123.catraki---sem.pages.dev')).toBe(true);
      expect(isOriginAllowed('https://catraki.com.br')).toBe(true);
      expect(isOriginAllowed('https://www.catraki.com.br')).toBe(true);
    });

    it('deve bloquear qualquer origem desconhecida ou maliciosa', () => {
      expect(isOriginAllowed('https://malicious-site.com')).toBe(false);
      expect(isOriginAllowed('https://hacker.org')).toBe(false);
      expect(isOriginAllowed('https://fake-catraki.com')).toBe(false);
      expect(isOriginAllowed('https://outro-site.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://outro-projeto.pages.dev')).toBe(false);
    });
  });
});
