import { describe, it, expect } from 'vitest';
import { publicRouter } from '../functions/routes/public.ts';

describe('Rotas Públicas e Validação de Autenticidade (publicRouter)', () => {
  it('deve retornar 400 se a query for vazia', async () => {
    const res = await publicRouter.request('/validate/%20', { method: 'GET' }, { DB: null as any });
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('INVALID_QUERY');
  });

  it('deve retornar 404 limpo (sem 500) ao consultar código inexistente como SESI-AFD6-4833 com DB vazio ou mock', async () => {
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    };

    const res = await publicRouter.request('/validate/SESI-AFD6-4833', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.valid).toBe(false);
    expect(json.code).toBe('MANIFEST_NOT_FOUND');
  });

  it('deve retornar 404 limpo se DB for undefined/nulo sem estourar 500', async () => {
    const res = await publicRouter.request('/validate/SESI-AFD6-4833', { method: 'GET' }, { DB: undefined as any });
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.valid).toBe(false);
    expect(json.code).toBe('MANIFEST_NOT_FOUND');
  });

  it('deve validar com sucesso código SESI-AFD6-4833 quando existente no banco de dados', async () => {
    const manifestSha = 'afd61234567890abcdef1234567890abcdef1234567890abcdef12345678904833';
    const mockRecord = {
      id: 'AUD-001',
      document_id: 'DOC-20260826-AFD64833',
      manifest_sha256: manifestSha,
      content_sha256_at_signing: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      signature_png_sha256: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      signed_at: '2026-08-26T18:00:00Z',
      signer_name: 'Maria da Silva Cotrim',
      signer_cpf_masked: '123.***.***-00',
      signer_relationship: 'MÃE',
      ip_address: '189.120.44.12',
      geo_city: 'Brasília',
      geo_region: 'DF',
      geo_country: 'BR',
      user_agent: 'Mozilla/5.0',
      identity_method: 'matricula_sesi',
      minor_name: 'Lucas Cotrim Silva',
      minor_series: '3º ano',
      minor_class: 'Turma B',
      minor_turn: 'Matutino',
      doc_status: 'signed',
      template_title: 'Autorização Oftalmológica SESI',
      procedure_description: 'Exame de acuidade visual',
      tsa_timestamp_token: 'tsa_valid_token',
    };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('COUNT(*)')) {
              return { pos: 42 };
            }
            return mockRecord;
          },
          all: async () => ({ results: [mockRecord] }),
          run: async () => ({ success: true }),
        }),
      }),
    };

    const res = await publicRouter.request('/validate/SESI-AFD6-4833', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.validation).toBeDefined();
    expect(json.validation.valid).toBe(true);
    expect(json.validation.validation_code).toBe('SESI-AFD6-4833');
    expect(json.validation.minor_name_initials).toBe('Lucas C. S.');
    expect(json.validation.chain_position).toBe(42);
    expect(json.validation.document_id).toBe('DOC-20260826-AFD64833');
  });

  it('deve retornar dados de client-info com resiliência', async () => {
    const res = await publicRouter.request('/client-info', { method: 'GET' }, {});
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.client).toBeDefined();
  });
});
