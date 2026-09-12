import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../src/lib/api.ts';
import { signerRouter } from '../functions/routes/signer.ts';
import { publicRouter } from '../functions/routes/public.ts';

describe('Validação Rigorosa de Slug de Escola na URL', () => {
  beforeEach(() => {
    apiClient.resetLocalDb();
  });

  it('deve retornar erro MISSING_SCHOOL_SLUG quando o slug da URL for vazio ou ausente', async () => {
    const resVazio = await apiClient.getSignerDoc('');
    expect(resVazio.success).toBe(false);
    expect(resVazio.code).toBe('MISSING_SCHOOL_SLUG');
    expect(resVazio.error).toContain('Nenhuma escola foi especificada');

    const resEspacos = await apiClient.getSignerDoc('   ');
    expect(resEspacos.success).toBe(false);
    expect(resEspacos.code).toBe('MISSING_SCHOOL_SLUG');
  });

  it('deve retornar erro SCHOOL_NOT_FOUND ao consultar escola não cadastrada no sistema', async () => {
    const res = await apiClient.getInstitutionBySlug('escola-inexistente-12345');
    expect(res.success).toBe(false);
    expect((res as any).code).toBe('SCHOOL_NOT_FOUND');
    expect((res as any).error).toContain('não foi encontrada no sistema');
  });

  it('deve carregar com sucesso os dados de escola previamente cadastrada (ex: CEMEIT)', async () => {
    apiClient.seedInstitution({
      id: 'cemeit',
      name: 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)',
      short_name: 'CEMEIT',
      city: 'Taguatinga',
      state: 'DF',
      is_active: true,
    });
    const res = await apiClient.getInstitutionBySlug('cemeit');
    expect(res.success).toBe(true);
    expect(res.institution?.id).toBe('cemeit');
    expect(res.institution?.short_name).toBe('CEMEIT');
    expect(res.institution?.name).toContain('CEMEIT');
  });

  it('deve retornar 404 SCHOOL_NOT_FOUND no endpoint /api/signer/doc/:token para escola não cadastrada no D1', async () => {
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

    const res = await signerRouter.request('/doc/escola-inexistente-999', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('SCHOOL_NOT_FOUND');
  });

  it('deve retornar 404 SCHOOL_NOT_FOUND no endpoint /api/public/institutions/:slug para escola não cadastrada', async () => {
    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    };

    const res = await publicRouter.request('/institutions/escola-fantasma', { method: 'GET' }, { DB: mockDb as any });
    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.code).toBe('SCHOOL_NOT_FOUND');
  });

  it('deve retornar SCHOOL_NOT_FOUND em getSignerDoc se a escola informada na URL não existir', async () => {
    const res = await apiClient.getSignerDoc('escola-qualquer-que-nao-existe');
    expect(res.success).toBe(false);
    expect(res.code).toBe('SCHOOL_NOT_FOUND');
    expect(res.error).toContain('não foi encontrada no sistema');
  });

  it('não deve fazer match parcial indevido para variações não cadastradas (ex: cemeit-2 ou escola-cemeit-xyz)', async () => {
    const res1 = await apiClient.getInstitutionBySlug('cemeit-falso');
    expect(res1.success).toBe(false);
    expect(res1.code).toBe('SCHOOL_NOT_FOUND');

    const res2 = await apiClient.getSignerDoc('escola-cemeit-inexistente');
    expect(res2.success).toBe(false);
    expect(res2.code).toBe('SCHOOL_NOT_FOUND');
  });
});

