import { describe, it, expect } from 'vitest';
import {
  normalizeTitularIdentifier,
  exportTitularDataByIdentifier,
  anonymizeTitularDataByIdentifier,
} from '../functions/utils/lgpd-titular.ts';
import { encryptAesGcm, hmacSha256 } from '../src/lib/crypto.ts';
import { signJwt } from '../functions/middleware/auth.ts';
import { adminRouter } from '../functions/routes/admin.ts';
import { publicRouter } from '../functions/routes/public.ts';

const MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const PEPPER = 'test-pepper-lgpd-2026';
const JWT_SECRET = 'test-jwt-secret-lgpd-2026';

function createStatefulLgpdDb(seed: {
  documents?: any[];
  audit_logs?: any[];
  lgpd_requests?: any[];
}) {
  const state = {
    documents: [...(seed.documents || [])],
    audit_logs: [...(seed.audit_logs || [])],
    lgpd_requests: [...(seed.lgpd_requests || [])],
    admin_audit_logs: [] as any[],
  };

  return {
    state,
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async <T = any>() => {
          if (query.includes('FROM admin_users')) {
            return {
              id: params[0],
              role: params[0] === 'op-1' ? 'operador' : 'dpo',
              is_active: 1,
            } as T;
          }
          if (query.includes('FROM documents WHERE id = ?')) {
            return (state.documents.find((d) => d.id === params[0]) || null) as T;
          }
          return null as T;
        },
        all: async <T = any>() => {
          if (query.includes('FROM documents') && query.includes('minor_cpf_bindex_sha256')) {
            const [b1, b2, masked] = params;
            const results = state.documents.filter(
              (d) =>
                d.minor_cpf_bindex_sha256 === b1 ||
                d.signer_cpf_bindex_sha256 === b2 ||
                d.minor_cpf === masked
            );
            return { results } as { results: T[] };
          }
          if (query.includes('FROM documents') && query.includes('parent_email_bindex_sha256')) {
            const [bindex] = params;
            const results = state.documents.filter((d) => d.parent_email_bindex_sha256 === bindex);
            return { results } as { results: T[] };
          }
          if (query.includes('FROM audit_logs WHERE document_id IN')) {
            const results = state.audit_logs.filter((a) => params.includes(a.document_id));
            return { results } as { results: T[] };
          }
          if (query.includes('FROM audit_logs WHERE signer_cpf_masked = ?')) {
            const results = state.audit_logs.filter((a) => a.signer_cpf_masked === params[0]);
            return { results } as { results: T[] };
          }
          if (query.includes('FROM lgpd_requests')) {
            const [b1, b2] = params;
            const results = state.lgpd_requests.filter(
              (r) => r.requester_cpf_bindex_sha256 === b1 || r.requester_email_bindex_sha256 === b2
            );
            return { results } as { results: T[] };
          }
          return { results: [] } as { results: T[] };
        },
        run: async () => {
          if (query.includes('INSERT INTO admin_audit_logs')) {
            state.admin_audit_logs.push({
              id: params[0],
              event_type: params[1],
              actor_user_id: params[2],
              action_details: params[8],
            });
          } else if (query.includes('INSERT INTO lgpd_requests')) {
            state.lgpd_requests.push({
              id: params[0],
              requester_name: params[1],
              requester_cpf_masked: params[2],
              requester_cpf_bindex_sha256: params[3],
              requester_email_encrypted: params[4],
              requester_email_bindex_sha256: params[5],
              request_type: params[6],
              details: params[7],
              privacy_policy_version: params[8],
              privacy_policy_accepted_at: params[9],
              response_deadline_at: params[10],
              status: 'pending',
            });
          } else if (query.includes('UPDATE documents')) {
            const docId = params[params.length - 1];
            const doc = state.documents.find((d) => d.id === docId);
            if (doc) {
              doc.minor_name = `ANONIMIZADO_LGPD_${doc.id.slice(0, 8)}`;
              doc.minor_birth_date = 'ANONIMIZADO';
              doc.parent_name = 'ANONIMIZADO_LGPD';
              doc.parent_email_encrypted = 'ANONIMIZADO';
              doc.parent_phone_encrypted = 'ANONIMIZADO';
              doc.parent_email_bindex_sha256 = null;
              doc.minor_cpf_encrypted = null;
              doc.minor_cpf_bindex_sha256 = null;
              doc.signer_cpf_bindex_sha256 = null;
              doc.minor_cpf = null;
            }
          } else if (query.includes('UPDATE lgpd_requests')) {
            const reqId = params[params.length - 1];
            const req = state.lgpd_requests.find((r) => r.id === reqId);
            if (req) {
              req.requester_name = 'ANONIMIZADO_LGPD';
              req.requester_cpf_masked = '***.***.***-**';
              req.requester_cpf_bindex_sha256 = null;
              req.requester_email_encrypted = 'ANONIMIZADO';
              req.requester_email_bindex_sha256 = null;
            }
          }
          return { success: true, meta: { changes: 1 } };
        },
      }),
    }),
  } as unknown as D1Database & { state: typeof state };
}

describe('Conformidade LGPD — Exportação, Anonimização Segura e Aceite de Política', () => {
  it('normalizeTitularIdentifier deve validar e normalizar CPF e e-mail', () => {
    const emailRes = normalizeTitularIdentifier('  Maria.Silva@Example.COM  ');
    expect(emailRes?.type).toBe('email');
    expect(emailRes?.normalized).toBe('maria.silva@example.com');

    const cpfRes = normalizeTitularIdentifier('529.982.247-25');
    expect(cpfRes?.type).toBe('cpf');
    expect(cpfRes?.normalized).toBe('52998224725');
    expect(cpfRes?.masked).toBe('529.***.***-25');

    expect(normalizeTitularIdentifier('111.111.111-11')).toBeNull();
    expect(normalizeTitularIdentifier('invalido')).toBeNull();
  });

  it('deve exportar todos os dados de uma pessoa por e-mail ou CPF e registrar auditoria', async () => {
    const email = 'responsavel.teste@example.com';
    const cpf = '52998224725';
    const emailBindex = await hmacSha256(email, PEPPER);
    const cpfBindex = await hmacSha256(cpf, PEPPER);

    const db = createStatefulLgpdDb({
      documents: [
        {
          id: 'DOC-20261116-0001',
          status: 'signed',
          institution_id: 'cemeit',
          institution_name: 'CEMEIT Taguatinga',
          template_id: 'proc_escola_cidada',
          template_version: 1,
          minor_name: 'Lucas Teste Silva',
          minor_birth_date: '2010-05-10',
          minor_cpf_encrypted: await encryptAesGcm(cpf, MASTER_KEY, 1),
          minor_cpf_bindex_sha256: cpfBindex,
          parent_name: 'Maria Teste Silva',
          parent_email_encrypted: await encryptAesGcm(email, MASTER_KEY, 1),
          parent_phone_encrypted: await encryptAesGcm('61999990000', MASTER_KEY, 1),
          parent_email_bindex_sha256: emailBindex,
          auth_health: 'yes',
          auth_data: 'yes',
          auth_image: 'no',
          terms_version: '1.0',
          privacy_policy_version: '1.1.2026',
          privacy_policy_accepted_at: '2026-11-16T21:00:00.000Z',
          created_at: '2026-11-16T21:00:00.000Z',
        },
      ],
      audit_logs: [
        {
          id: 'AUD-1',
          document_id: 'DOC-20261116-0001',
          signed_at: '2026-11-16T21:01:00.000Z',
          signer_name: 'Maria Teste Silva',
          signer_cpf_encrypted: await encryptAesGcm(cpf, MASTER_KEY, 1),
          signer_cpf_masked: '529.***.***-25',
          signer_relationship: 'Mãe',
          identity_method: 'declaracao_responsavel',
          ip_address: '177.10.20.30',
          manifest_sha256: 'a'.repeat(64),
          log_row_hash: 'b'.repeat(64),
          signature_png_sha256: 'c'.repeat(64),
        },
      ],
    });

    const dossier = await exportTitularDataByIdentifier(
      db,
      { ENCRYPTION_KEY_V1: MASTER_KEY, OTP_PEPPER: PEPPER },
      email,
      { sub: 'dpo-1', email: 'dpo@sistemafibra.org.br', role: 'dpo' }
    );

    expect(dossier.summary.total_documents).toBe(1);
    expect(dossier.summary.total_audit_logs).toBe(1);
    expect(dossier.documents[0].parent_or_signer.email).toBe(email);
    expect(dossier.documents[0].minor.cpf).toBe(cpf);
    expect(dossier.documents[0].consents.privacy_policy_version).toBe('1.1.2026');
    expect(db.state.admin_audit_logs[0].event_type).toBe('LGPD_DATA_EXPORT');
  });

  it('deve anonimizar dados pessoais preservando audit_logs (Hash Chain imutável)', async () => {
    const email = 'apagar.titular@example.com';
    const emailBindex = await hmacSha256(email, PEPPER);

    const db = createStatefulLgpdDb({
      documents: [
        {
          id: 'DOC-20261116-0002',
          status: 'signed',
          minor_name: 'Pedro Apagar Silva',
          minor_birth_date: '2011-01-20',
          parent_name: 'Carlos Apagar Silva',
          parent_email_encrypted: await encryptAesGcm(email, MASTER_KEY, 1),
          parent_email_bindex_sha256: emailBindex,
        },
      ],
      audit_logs: [
        {
          id: 'AUD-2',
          document_id: 'DOC-20261116-0002',
          log_row_hash: 'd'.repeat(64),
        },
      ],
    });

    const report = await anonymizeTitularDataByIdentifier(
      db,
      { ENCRYPTION_KEY_V1: MASTER_KEY, OTP_PEPPER: PEPPER },
      email,
      'Pedido LGPD-2026-001',
      { sub: 'dpo-1', email: 'dpo@sistemafibra.org.br', role: 'dpo' }
    );

    expect(report.documents_anonymized).toBe(1);
    expect(report.audit_logs_preserved_for_legal_compliance).toBe(1);
    expect(db.state.documents[0].minor_name).toContain('ANONIMIZADO_LGPD');
    expect(db.state.documents[0].parent_email_encrypted).toBe('ANONIMIZADO');
    // Hash Chain permanece intacta
    expect(db.state.audit_logs).toHaveLength(1);
    expect(db.state.audit_logs[0].log_row_hash).toBe('d'.repeat(64));
    expect(db.state.admin_audit_logs[0].event_type).toBe('LGPD_DATA_ANONYMIZATION');
  });

  it('POST /api/public/lgpd-request deve gravar aceite da política com versão/data/hora e prazo de 15 dias', async () => {
    const db = createStatefulLgpdDb({});
    const env = { DB: db, ENCRYPTION_KEY_V1: MASTER_KEY, OTP_PEPPER: PEPPER };

    const resp = await publicRouter.request(
      '/lgpd-request',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: 'Ana Paula Souza',
          requester_cpf: '52998224725',
          requester_email: 'ana@example.com',
          request_type: 'access',
          details: 'Solicito acesso completo aos meus dados pessoais cadastrados no sistema.',
          privacy_policy_accepted: true,
          privacy_policy_version: '1.1.2026',
          privacy_policy_accepted_at: '2026-11-16T21:10:00.000Z',
        }),
      },
      env as any
    );

    expect(resp.status).toBe(200);
    const json: any = await resp.json();
    expect(json.success).toBe(true);
    expect(json.privacy_policy_version).toBe('1.1.2026');
    expect(json.privacy_policy_accepted_at).toBe('2026-11-16T21:10:00.000Z');
    expect(json.response_deadline_at).toBeTruthy();
    expect(db.state.lgpd_requests).toHaveLength(1);
  });

  it('rotas /lgpd/export e /lgpd/anonymize devem exigir RBAC dpo ou admin_master', async () => {
    const db = createStatefulLgpdDb({});
    const env = { DB: db, ENCRYPTION_KEY_V1: MASTER_KEY, OTP_PEPPER: PEPPER, JWT_ADMIN_SECRET: JWT_SECRET };

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const opToken = await signJwt({ sub: 'op-1', email: 'op@sistemafibra.org.br', role: 'operador', name: 'Operador', exp }, JWT_SECRET);
    const forbiddenResp = await adminRouter.request(
      '/lgpd/export',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${opToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'ana@example.com' }),
      },
      env as any
    );
    expect(forbiddenResp.status).toBe(403);

    const dpoToken = await signJwt({ sub: 'dpo-1', email: 'dpo@sistemafibra.org.br', role: 'dpo', name: 'DPO', exp }, JWT_SECRET);
    const okResp = await adminRouter.request(
      '/lgpd/export',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${dpoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'ana@example.com' }),
      },
      env as any
    );
    expect(okResp.status).toBe(200);
  });
});
