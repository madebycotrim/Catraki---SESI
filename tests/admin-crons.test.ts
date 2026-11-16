import { describe, it, expect } from 'vitest';
import { adminRouter } from '../functions/routes/admin.ts';
import { handleScheduled } from '../functions/crons/index.ts';
import { signJwt } from '../functions/middleware/auth.ts';
import { encryptAesGcm } from '../src/lib/crypto.ts';

describe('Admin Router & Crons Integration', () => {
  const jwtSecret = 'test-jwt-secret-admin-123456';
  const masterKey = 'test-master-key-1234567890123456';

  async function makeToken(role: 'operador' | 'dpo' | 'admin_master') {
    return await signJwt(
      {
        sub: `usr-${role}`,
        name: `User ${role}`,
        email: `${role}@sesi.org.br`,
        role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      jwtSecret
    );
  }

  it('GET /api/admin/documents deve mascarar minor_cpf para operador e exibir completo para admin_master', async () => {
    const encryptedCpf = await encryptAesGcm('12345678909', masterKey, 1);
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.includes('FROM admin_users')) {
              const idOrEmail = String(args[0] || '');
              const role = idOrEmail.includes('admin_master') ? 'admin_master' : 'operador';
              return { is_active: 1, role };
            }
            return null;
          },
          all: async () => ({
            results: [
              {
                id: 'DOC-1',
                status: 'signed',
                minor_name: 'Estudante Teste',
                minor_cpf_encrypted: encryptedCpf,
                otp_secret_hash: 'secret-hash',
                parent_email_encrypted: 'enc-email',
              },
            ],
          }),
        }),
        all: async () => ({ results: [] }),
      }),
    };

    const opToken = await makeToken('operador');
    const opRes = await adminRouter.fetch(
      new Request('http://localhost/documents', { headers: { Authorization: `Bearer ${opToken}` } }),
      { DB: mockDb, JWT_ADMIN_SECRET: jwtSecret, ENCRYPTION_KEY_V1: masterKey } as any
    );
    expect(opRes.status).toBe(200);
    const opData = (await opRes.json()) as any;
    expect(opData.documents[0].minor_cpf).toBe('123.***.***-09');
    expect(opData.documents[0].otp_secret_hash).toBeUndefined();
    expect(opData.documents[0].parent_email_encrypted).toBeUndefined();

    const masterToken = await makeToken('admin_master');
    const masterRes = await adminRouter.fetch(
      new Request('http://localhost/documents', { headers: { Authorization: `Bearer ${masterToken}` } }),
      { DB: mockDb, JWT_ADMIN_SECRET: jwtSecret, ENCRYPTION_KEY_V1: masterKey } as any
    );
    expect(masterRes.status).toBe(200);
    const masterData = (await masterRes.json()) as any;
    expect(masterData.documents[0].minor_cpf).toBe('123.456.789-09');
  });

  it('POST /api/admin/lgpd-requests/:id/respond deve validar status e parecer com Zod (400)', async () => {
    const dpoToken = await makeToken('dpo');
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ is_active: 1, role: 'dpo' }),
        }),
      }),
    };

    const res = await adminRouter.fetch(
      new Request('http://localhost/lgpd-requests/LGPD-1/respond', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dpoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'invalid_status', response_notes: 'ok' }),
      }),
      { DB: mockDb, JWT_ADMIN_SECRET: jwtSecret } as any
    );
    expect(res.status).toBe(400);
  });

  it('handleScheduled deve executar expiração, anonimização LGPD, expurgo e checagem de integridade sem lançar erro', async () => {
    const executedQueries: string[] = [];
    const mockDb = {
      prepare: (sql: string) => {
        executedQueries.push(sql);
        const runner = {
          bind: (..._args: any[]) => runner,
          run: async () => ({ meta: { changes: 0 } }),
          all: async () => ({ results: [] }),
        };
        return runner;
      },
    };

    await expect(handleScheduled({ DB: mockDb } as any)).resolves.toBeUndefined();
    expect(executedQueries.some((q) => q.includes("SET status = 'expired'"))).toBe(true);
    expect(executedQueries.some((q) => q.includes('DELETE FROM application_access_logs'))).toBe(true);
  });
});
