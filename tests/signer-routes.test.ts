import { describe, it, expect } from 'vitest';
import { signerRouter } from '../functions/routes/signer.ts';

describe('Rotas de Assinatura Eletrônica (signerRouter) — Resiliência e Prevenção de Erro 500', () => {
  it('deve retornar 503 DB_UNAVAILABLE se o binding do banco D1 for undefined', async () => {
    const res = await signerRouter.request('/doc/projeto-escola-cidada-2026', { method: 'GET' }, { DB: undefined as any });
    expect(res.status).toBe(503);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('DB_UNAVAILABLE');
  });

  it('deve responder 404 TEMPLATE_NOT_FOUND quando a tabela document_templates do banco estiver vazia', async () => {
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
        first: async () => null,
      }),
    };

    const res = await signerRouter.request('/doc/projeto-escola-cidada-2026', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('deve retornar 400 se o token for vazio ou apenas espaços', async () => {
    const res = await signerRouter.request('/doc/%20', { method: 'GET' }, { DB: undefined as any });
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('INVALID_TOKEN');
  });

  it('deve retornar 410 TOKEN_REVOKED se o token estiver na denylist do KV', async () => {
    const mockKv = {
      get: async (key: string) => {
        if (key === 'revoked:token-revogado-123') return '2026-09-03T18:00:00Z';
        return null;
      },
      put: async () => {},
      delete: async () => {},
    };

    const res = await signerRouter.request(
      '/doc/token-revogado-123',
      { method: 'GET' },
      { DB: undefined as any, KV_RATE_LIMIT: mockKv as any }
    );
    expect(res.status).toBe(410);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('TOKEN_REVOKED');
  });

  it('deve retornar dados do documento existente quando presente no banco D1', async () => {
    const mockDoc = {
      id: 'DOC-20260903-TESTE',
      status: 'pending',
      minor_name: 'Ana Júlia Silva',
      minor_birth_date: '2010-05-12',
      parent_name: 'Carlos Silva',
      template_title: 'Escola Cidadã: Saúde em Movimento',
      procedure_description: 'Atendimento do aluno no projeto Escola Cidadã',
      content_markdown: '# Termo Especial',
      content_sha256: '5d98b3c1ad95490eba3b6339902569637cb26659bbaefc481b6e8c9edf5261da',
      consent_text_version: 1,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('documents')) return mockDoc;
            return null;
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    };

    const res = await signerRouter.request('/doc/DOC-20260903-TESTE', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.document.minor_name).toBe('Ana Júlia Silva');
    expect(json.document.parent_name).toBe('Carlos Silva');
  });

  it('deve puxar a instituição cemeit e o modelo dinamicamente do banco de dados D1', async () => {
    const mockInstitution = {
      id: 'cemeit',
      name: 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)',
      short_name: 'CEMEIT',
      city: 'Taguatinga',
      state: 'DF',
      is_active: 1,
    };

    const mockTemplate = {
      id: 'proc_escola_cidada',
      version: 1,
      title: 'Escola Cidadã: Saúde em Movimento (D1 Database)',
      procedure_description: 'Descrição oficial puxada do banco D1',
      content_markdown: '## Termo Oficial do Banco D1',
      content_sha256: '5d98b3c1ad95490eba3b6339902569637cb26659bbaefc481b6e8c9edf5261da',
      consent_text_version: 1,
      is_active: 1,
    };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('FROM documents')) return null;
            if (sql.includes('institutions')) return mockInstitution;
            if (sql.includes('document_templates')) return mockTemplate;
            return null;
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
        first: async () => {
          if (sql.includes('FROM documents')) return null;
          if (sql.includes('institutions')) return mockInstitution;
          if (sql.includes('document_templates')) return mockTemplate;
          return null;
        },
      }),
    };

    const res = await signerRouter.request('/doc/cemeit', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.document.institution_id).toBe('cemeit');
    expect(json.document.institution_name).toBe('Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)');
    expect(json.document.procedure_title).toBe('Escola Cidadã: Saúde em Movimento (D1 Database)');
    expect(json.document.content_markdown).toBe('## Termo Oficial do Banco D1');
  });
});
