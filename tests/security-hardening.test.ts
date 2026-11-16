import { describe, it, expect } from 'vitest';
import {
  SignDocumentSchema,
  FullNameSchema,
} from '../src/lib/schemas.ts';
import {
  constantTimeEqual,
  canonicalJson,
  decryptAesGcm,
  stripExifFromBase64Image,
  bytesToBase64,
} from '../src/lib/crypto.ts';
import { publicRouter } from '../functions/routes/public.ts';
import { signerRouter } from '../functions/routes/signer.ts';
import { authMicrosoftRouter } from '../functions/routes/auth-microsoft.ts';
import { adminRouter } from '../functions/routes/admin.ts';
import { signJwt } from '../functions/middleware/auth.ts';

describe('Security Hardening & Regression Tests', () => {
  describe('Schemas & Validation', () => {
    it('deve rejeitar signature_png_base64 maior que 500KB mesmo com prefixo PNG válido', () => {
      const oversizedPng = 'data:image/png;base64,' + 'A'.repeat(500001);
      const res = SignDocumentSchema.shape.signature_png_base64.safeParse(oversizedPng);
      expect(res.success).toBe(false);
    });

    it('deve rejeitar signature_png_base64 sem prefixo data:image/png;base64, mesmo sendo pequeno', () => {
      const invalidFormat = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const res = SignDocumentSchema.shape.signature_png_base64.safeParse(invalidFormat);
      expect(res.success).toBe(false);
    });

    it('deve exigir mínimo de 5 caracteres em FullNameSchema', () => {
      expect(FullNameSchema.safeParse('Ana').success).toBe(false);
      expect(FullNameSchema.safeParse('Maria Silva').success).toBe(true);
    });
  });

  describe('Crypto Hardening', () => {
    it('constantTimeEqual deve retornar false para comprimentos diferentes e true para iguais', () => {
      expect(constantTimeEqual('abc', 'abcd')).toBe(false);
      expect(constantTimeEqual('abc', 'abc')).toBe(true);
      expect(constantTimeEqual('abc', 'abd')).toBe(false);
    });

    it('canonicalJson deve omitir chaves com valor undefined mantendo JSON válido', () => {
      const json = canonicalJson({ b: 2, a: undefined, c: 3 });
      expect(json).toBe('{"b":2,"c":3}');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('decryptAesGcm deve lançar erro explícito para JSON ou envelope inválido', async () => {
      await expect(decryptAesGcm('not-json', 'test-secret-key')).rejects.toThrow();
      await expect(decryptAesGcm('{"v":1}', 'test-secret-key')).rejects.toThrow();
    });

    it('stripExifFromBase64Image deve remover chunk tEXt de imagens PNG', () => {
      // PNG mínimo válido: assinatura + IHDR + tEXt + IEND
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        // IHDR (0 bytes data para teste estrutural)
        0x00, 0x00, 0x00, 0x00, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x00,
        // tEXt ("hi")
        0x00, 0x00, 0x00, 0x02, 0x74, 0x45, 0x58, 0x74, 0x68, 0x69, 0x00, 0x00, 0x00, 0x00,
        // IEND
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0x00, 0x00, 0x00, 0x00,
      ]);
      const dataUrl = `data:image/png;base64,${bytesToBase64(pngBytes)}`;
      const cleaned = stripExifFromBase64Image(dataUrl);
      expect(cleaned.length).toBeLessThan(dataUrl.length);
    });
  });

  describe('Proteção de Endpoints Críticos', () => {
    it('POST /api/public/batch-check deve rejeitar requisição sem x-api-key (401)', async () => {
      const req = new Request('http://localhost/batch-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfs: ['12345678909'] }),
      });
      const res = await publicRouter.fetch(req, {
        BULK_CHECK_API_KEY: 'super-secret-api-key',
        OTP_PEPPER: 'pepper-secret',
      } as any);
      expect(res.status).toBe(401);
    });

    it('POST /api/signer/revoke deve bloquear revogação usando apenas document_id público sem verificação de CPF (403)', async () => {
      const mockDb = {
        prepare: (sql: string) => ({
          bind: (..._args: any[]) => ({
            first: async () => {
              if (sql.includes('WHERE access_token = ?')) return null;
              if (sql.includes('WHERE id = ?')) {
                return { id: 'DOC-20260101-120000-ABCD', status: 'signed', access_token: 'secret-token-xyz' };
              }
              if (sql.includes('FROM audit_logs')) {
                return { signer_cpf_encrypted: '' };
              }
              return null;
            },
          }),
        }),
      };

      const req = new Request('http://localhost/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'DOC-20260101-120000-ABCD',
          reason: 'Tentativa de revogação não autorizada por terceiros',
          confirm_legal_consequence: true,
        }),
      });

      const res = await signerRouter.fetch(req, {
        DB: mockDb,
        ENCRYPTION_KEY_V1: 'test-master-key-1234567890123456',
      } as any);

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.code).toBe('IDENTITY_VERIFICATION_REQUIRED');
    });

    it('GET /api/auth/me deve retornar 403 se usuário estiver desativado (is_active = 0) no D1', async () => {
      const secret = 'jwt-test-secret-123456';
      const token = await signJwt(
        {
          sub: 'usr-1',
          name: 'Operador Teste',
          email: 'operador@sesi.org.br',
          role: 'operador',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        secret
      );

      const mockDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ is_active: 0, role: 'operador' }),
          }),
        }),
      };

      const req = new Request('http://localhost/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await authMicrosoftRouter.fetch(req, {
        JWT_ADMIN_SECRET: secret,
        DB: mockDb,
      } as any);

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('DELETE /api/admin/documents/:id/hard-delete deve bloquear operador (403) e exigir admin_master', async () => {
      const secret = 'jwt-test-secret-123456';
      const token = await signJwt(
        {
          sub: 'usr-op',
          name: 'Operador',
          email: 'operador@sesi.org.br',
          role: 'operador',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        secret
      );

      const mockDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ is_active: 1, role: 'operador' }),
          }),
        }),
      };

      const req = new Request('http://localhost/documents/DOC-123/hard-delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await adminRouter.fetch(req, {
        JWT_ADMIN_SECRET: secret,
        DB: mockDb,
      } as any);

      expect(res.status).toBe(403);
    });
  });
});
