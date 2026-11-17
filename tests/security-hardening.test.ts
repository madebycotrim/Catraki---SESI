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
  hmacSha256,
} from '../src/lib/crypto.ts';
import { publicRouter } from '../functions/routes/public.ts';
import { signerRouter } from '../functions/routes/signer.ts';
import { authMicrosoftRouter } from '../functions/routes/auth-microsoft.ts';
import { adminRouter } from '../functions/routes/admin.ts';
import { signJwt, verifyJwt } from '../functions/middleware/auth.ts';

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

  describe('Blindagem de Back-End (JWT, Consentimentos, Idade e OTP em /sign)', () => {
    it('verifyJwt deve rejeitar token com algoritmo alg=none e token sem exp', async () => {
      const secret = 'jwt-test-secret-123456';
      const headerNone = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
      const payload = btoa(JSON.stringify({ sub: '1', role: 'admin_master', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '');
      const sig = await hmacSha256(`${headerNone}.${payload}`, secret);
      expect(await verifyJwt(`${headerNone}.${payload}.${sig}`, secret)).toBeNull();

      const headerHs = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
      const payloadNoExp = btoa(JSON.stringify({ sub: '1', role: 'admin_master' })).replace(/=/g, '');
      const sigNoExp = await hmacSha256(`${headerHs}.${payloadNoExp}`, secret);
      expect(await verifyJwt(`${headerHs}.${payloadNoExp}.${sigNoExp}`, secret)).toBeNull();
    });

    it('POST /api/signer/sign deve rejeitar auth_health="no", auth_data="no" e menor tentando assinar como titular', async () => {
      const basePayload = {
        token: 'token-teste-1234567890',
        otp_code: '123456',
        signer_name: 'Mateus Cotrim Silva',
        signer_cpf: '123.456.789-09',
        signer_relationship: 'Pai',
        minor_name: 'Lucas Cotrim Silva',
        minor_birth_date: '2010-05-14',
        minor_cpf: '123.456.789-09',
        auth_health: 'yes',
        auth_data: 'yes',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
      };

      const env = {
        ENCRYPTION_KEY_V1: 'SESI_ENCRYPTION_KEY_32BYTES_PROD_12345',
        OTP_PEPPER: 'SESI_OTP_PEPPER_SECRET_KEY_PROD_98765',
        DB: {
          prepare: () => ({
            bind: () => ({
              first: async () => ({ id: 'DOC-1', status: 'pending', minor_birth_date: '2010-05-14' }),
              run: async () => ({ meta: { changes: 1 } }),
            }),
          }),
        },
      } as any;

      const resNoHealth = await signerRouter.fetch(
        new Request('http://localhost/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, auth_health: 'no' }),
        }),
        env
      );
      expect(resNoHealth.status).toBe(400);
      expect(((await resNoHealth.json()) as any).code).toBe('HEALTH_CONSENT_REQUIRED');

      const resNoData = await signerRouter.fetch(
        new Request('http://localhost/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, auth_data: 'no' }),
        }),
        env
      );
      expect(resNoData.status).toBe(400);
      expect(((await resNoData.json()) as any).code).toBe('DATA_CONSENT_REQUIRED');

      const resMinorSelf = await signerRouter.fetch(
        new Request('http://localhost/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...basePayload,
            signer_relationship: 'Próprio Estudante (Maior de Idade)',
          }),
        }),
        env
      );
      expect(resMinorSelf.status).toBe(400);
      expect(((await resMinorSelf.json()) as any).code).toBe('MINOR_CANNOT_SELF_SIGN');
    });

    it('POST /api/signer/sign deve bloquear OTP expirado e excesso de tentativas (3+)', async () => {
      const pepper = 'SESI_OTP_PEPPER_SECRET_KEY_PROD_98765';
      const otpHash = await hmacSha256('123456', pepper);
      const basePayload = {
        token: 'token-teste-1234567890',
        otp_code: '123456',
        signer_name: 'Mateus Cotrim Silva',
        signer_cpf: '123.456.789-09',
        signer_relationship: 'Pai',
        minor_name: 'Lucas Cotrim Silva',
        minor_birth_date: '2010-05-14',
        minor_cpf: '123.456.789-09',
        auth_health: 'yes',
        auth_data: 'yes',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
      };

      const makeEnv = (docOverrides: Record<string, any>) =>
        ({
          ENCRYPTION_KEY_V1: 'SESI_ENCRYPTION_KEY_32BYTES_PROD_12345',
          OTP_PEPPER: pepper,
          DB: {
            prepare: (sql: string) => ({
              bind: () => ({
                first: async () => {
                  if (sql.includes("status = 'signed'")) return null;
                  return {
                    id: 'DOC-1',
                    status: 'pending',
                    minor_birth_date: '2010-05-14',
                    otp_secret_hash: otpHash,
                    otp_attempts: 0,
                    otp_expires_at: new Date(Date.now() + 60000).toISOString(),
                    ...docOverrides,
                  };
                },
                run: async () => ({ meta: { changes: 1 } }),
              }),
            }),
          },
        }) as any;

      const resExpired = await signerRouter.fetch(
        new Request('http://localhost/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        }),
        makeEnv({ otp_expires_at: new Date(Date.now() - 60000).toISOString() })
      );
      expect(resExpired.status).toBe(400);
      expect(((await resExpired.json()) as any).code).toBe('OTP_EXPIRED');

      const resBlocked = await signerRouter.fetch(
        new Request('http://localhost/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        }),
        makeEnv({ otp_attempts: 3 })
      );
      expect(resBlocked.status).toBe(400);
      expect(((await resBlocked.json()) as any).code).toBe('OTP_BLOCKED');
    });

    it('POST /api/admin/documents/cleanup-pending deve bloquear perfil dpo (403)', async () => {
      const secret = 'jwt-test-secret-123456';
      const token = await signJwt(
        {
          sub: 'usr-dpo',
          name: 'DPO',
          email: 'dpo@sesi.org.br',
          role: 'dpo',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        secret
      );

      const mockDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ is_active: 1, role: 'dpo' }),
          }),
        }),
      };

      const res = await adminRouter.fetch(
        new Request('http://localhost/documents/cleanup-pending', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
        { JWT_ADMIN_SECRET: secret, DB: mockDb } as any
      );
      expect(res.status).toBe(403);
    });
  });
});
