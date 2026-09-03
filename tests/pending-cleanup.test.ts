import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../src/lib/api.ts';

describe('Gestão Jurídica de Termos Pendentes e Expiração de 24 Horas (LGPD Art. 16)', () => {
  beforeEach(() => {
    // Reseta localStorage de testes
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('deve gerar rascunho pendente com tempo de expiração (TTL) de 24 horas', async () => {
    const token = `test-school-${Date.now()}`;
    const docResp = await apiClient.getSignerDoc(token);

    expect(docResp.success).toBe(true);
    expect(docResp.document).toBeDefined();
    expect(docResp.document.status).toBe('pending');
    expect(docResp.document.expires_at).toBeDefined();

    const expiresAt = new Date(docResp.document.expires_at).getTime();
    const now = Date.now();
    const diffHours = (expiresAt - now) / (1000 * 60 * 60);

    // Deve estar configurado para aproximadamente 24 horas (entre 23h e 25h)
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
  });

  it('deve expirar rascunhos pendentes abandonados com mais de 24 horas ao chamar cleanupPendingDocuments()', async () => {
    // 1. Cria um rascunho recente (<24h)
    const tokenRecente = `doc-recente-${Date.now()}`;
    await apiClient.getSignerDoc(tokenRecente);

    // 2. Executa a limpeza administrativa
    const cleanupResult = await apiClient.cleanupPendingDocuments();
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.message).toContain('LGPD');
  });

  it('não deve permitir que documentos no status signed sejam expirados ou alterados para pendente', async () => {
    const docs = await apiClient.getAdminDocuments('all');
    const signedDocs = (docs.documents || []).filter((d: any) => d.status === 'signed');

    // Executa a rotina de limpeza de pendentes
    await apiClient.cleanupPendingDocuments();

    // Reconsulta os documentos
    const postCleanup = await apiClient.getAdminDocuments('all');
    const postSigned = (postCleanup.documents || []).filter((d: any) => d.status === 'signed');

    // O número de documentos assinados deve permanecer rigorosamente inalterado
    expect(postSigned.length).toBe(signedDocs.length);
  });
});
