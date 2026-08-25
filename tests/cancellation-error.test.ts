import { describe, it, expect } from 'vitest';
import { CancelDocumentErrorSchema } from '../src/lib/schemas.ts';
import { sha256 } from '../src/lib/crypto.ts';
import {
  getTransactionalCancellationEmailHtml,
  getTransactionalCancellationEmailText,
} from '../src/lib/email-templates.ts';

describe('Funcionalidade: Revogação e Cancelamento por Erro Operacional (LGPD / Marco Civil)', () => {
  describe('Validação de Schemas (CancelDocumentErrorSchema)', () => {
    it('deve aceitar payload válido com justificativa detalhada e dupla confirmação', () => {
      const validPayload = {
        reason: 'Inconsistência cadastral no CPF do aluno digitado pelo responsável legal',
        confirmed: true,
      };

      const result = CancelDocumentErrorSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe(validPayload.reason);
        expect(result.data.confirmed).toBe(true);
      }
    });

    it('deve rejeitar justificativa com menos de 10 caracteres', () => {
      const invalidPayload = {
        reason: 'Erro',
        confirmed: true,
      };

      const result = CancelDocumentErrorSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('no mínimo 10 caracteres');
      }
    });

    it('deve rejeitar justificativa composta apenas por espaços em branco', () => {
      const whitespacePayload = {
        reason: '           ',
        confirmed: true,
      };

      const result = CancelDocumentErrorSchema.safeParse(whitespacePayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar quando a confirmação explícita não for firmada (confirmed !== true)', () => {
      const missingConfirmationPayload = {
        reason: 'Duplicidade de cadastro identificada pela secretaria escolar',
        confirmed: false,
      };

      const result = CancelDocumentErrorSchema.safeParse(missingConfirmationPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('obrigatório confirmar expressamente');
      }
    });
  });

  describe('Integridade Criptográfica e Trilha Forense', () => {
    it('deve gerar hash SHA-256 de 64 caracteres hexadecimais para a linha de auditoria', async () => {
      const auditId = 'CANCEL-20260825-103000-4821';
      const docId = 'DOC-20260825-001';
      const timestamp = '2026-08-25T13:30:00.000Z';
      const userId = 'USR-OPERADOR-01';
      const userEmail = 'operador.sesi@sesi.org.br';
      const role = 'operador';
      const clientIp = '201.86.120.45';
      const manifestSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const reason = 'Inconsistência de série e turno do estudante identificada pela coordenação';

      const rowContent = `${auditId}|${docId}|${timestamp}|${userId}|${userEmail}|${role}|${clientIp}|${manifestSha256}|${reason}`;
      const hash = await sha256(rowContent);

      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);

      // Determinismo do cálculo criptográfico
      const hashRecomputed = await sha256(rowContent);
      expect(hashRecomputed).toBe(hash);
    });
  });

  describe('Template de E-mail Transacional de Notificação (LGPD Art. 6º, VI e Art. 18)', () => {
    const mockParams = {
      parentName: 'Maria Silva Santos',
      minorName: 'Lucas Silva Santos',
      documentId: 'DOC-20260825-001',
      validationCode: 'SESI-8661-7A48',
      cancelledAtFormatted: '25/08/2026 às 10:30 (Horário de Brasília)',
      institutionName: 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)',
      reason: 'Inconsistência cadastral na data de nascimento do estudante',
      supportEmail: 'suporte.escolacidada@catraki.com.br',
      dpoContact: 'privacidade@catraki.com.br',
    };

    it('deve gerar template HTML com badges de status, menção à LGPD e próximos passos', () => {
      const html = getTransactionalCancellationEmailHtml(mockParams);

      expect(html).toContain('Maria Silva Santos');
      expect(html).toContain('Lucas Silva Santos');
      expect(html).toContain('SESI-8661-7A48');
      expect(html).toContain('CANCELADO POR ERRO');
      expect(html).toContain('CEMEIT');
      expect(html).toContain('Inconsistência cadastral na data de nascimento');
      expect(html).toContain('Próximos Passos');
      expect(html).toContain('Emissão de Nova Via');
      expect(html).toContain('LGPD');
      expect(html).toContain('privacidade@catraki.com.br');
    });

    it('deve gerar template em texto puro contendo todos os elementos essenciais de auditoria', () => {
      const text = getTransactionalCancellationEmailText(mockParams);

      expect(text).toContain('INVALIDADA ADMINISTRATIVAMENTE');
      expect(text).toContain('SESI-8661-7A48');
      expect(text).toContain('Lucas Silva Santos');
      expect(text).toContain('CANCELADO POR ERRO');
      expect(text).toContain('Lei nº 13.709/2018');
      expect(text).toContain('Marco Civil da Internet');
      expect(text).toContain('privacidade@catraki.com.br');
    });
  });
});
