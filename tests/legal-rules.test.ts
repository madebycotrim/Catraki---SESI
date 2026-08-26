import { describe, it, expect } from 'vitest';
import {
  isValidFullName,
  validateFullName,
  calcularIdade,
  SignDocumentSchema,
  CreateDocumentSchema,
} from '../src/lib/schemas.ts';

describe('Módulo de Conformidade Legal & Anti-Fraude (LGPD, Lei 14.063, ECA)', () => {
  describe('Validação de Nomes Completos e Anti-Fraude (isValidFullName)', () => {
    it('deve aceitar nomes completos legítimos', () => {
      expect(isValidFullName('Mateus Cotrim')).toBe(true);
      expect(isValidFullName('João da Silva Santos')).toBe(true);
      expect(isValidFullName('Ana Clara de Oliveira')).toBe(true);
      expect(isValidFullName('José Carlos Pereira Júnior')).toBe(true);
      expect(isValidFullName('Maria das Graças')).toBe(true);
    });

    it('deve rejeitar nomes com apenas uma palavra', () => {
      expect(isValidFullName('Mateus')).toBe(false);
      expect(isValidFullName('Gaga')).toBe(false);
      expect(isValidFullName('Ana')).toBe(false);
      expect(isValidFullName('')).toBe(false);
      expect(isValidFullName('   ')).toBe(false);
    });

    it('deve rejeitar palavras repetidas sequenciais idênticas (ex: "Gaga gaga", "teste teste")', () => {
      expect(isValidFullName('Gaga gaga')).toBe(false);
      expect(isValidFullName('GAGA GAGA')).toBe(false);
      expect(isValidFullName('teste teste')).toBe(false);
      expect(isValidFullName('aaaa aaaa')).toBe(false);
      expect(isValidFullName('blabla blabla')).toBe(false);
      expect(isValidFullName('João joão')).toBe(false);
    });

    it('deve rejeitar caracteres repetidos 3 ou mais vezes consecutivas (ex: "Jooaaao", "Gaaaaga")', () => {
      expect(isValidFullName('Gaaaaga Silva')).toBe(false);
      expect(isValidFullName('Jooaaao da Silva')).toBe(false);
      expect(isValidFullName('Maaaaria Santos')).toBe(false);
      expect(isValidFullName('Pedro Silvvva')).toBe(false);
    });

    it('deve rejeitar nomes fictícios e de teste conhecidos', () => {
      expect(isValidFullName('Teste Teste')).toBe(false);
      expect(isValidFullName('Asdf Qwerty')).toBe(false);
      expect(isValidFullName('Anonimo Anonimo')).toBe(false);
      expect(isValidFullName('Nao Informado')).toBe(false);
      expect(isValidFullName('Sem Nome')).toBe(false);
      expect(isValidFullName('Fulano de Tal')).toBe(false);
    });

    it('deve rejeitar nomes com caracteres especiais ou números inválidos', () => {
      expect(isValidFullName('Mateus 123')).toBe(false);
      expect(isValidFullName('Maria @Silva')).toBe(false);
      expect(isValidFullName('Carlos_Pereira')).toBe(false);
    });

    it('deve retornar mensagens de erro ricas via validateFullName', () => {
      expect(validateFullName('Gaga gaga').valid).toBe(false);
      expect(validateFullName('Gaga gaga').error).toBeDefined();
    });
  });

  describe('Cálculo de Idade Preciso e Maioridade (calcularIdade)', () => {
    it('deve calcular a idade corretamente a partir de string ISO YYYY-MM-DD', () => {
      const ref = new Date(2026, 7, 26); // 26/08/2026
      expect(calcularIdade('2000-01-15', ref)).toBe(26);
      expect(calcularIdade('2008-08-25', ref)).toBe(18);
      expect(calcularIdade('2008-08-26', ref)).toBe(18);
      expect(calcularIdade('2008-08-27', ref)).toBe(17); // Aniversário amanhã
      expect(calcularIdade('2012-05-10', ref)).toBe(14);
      expect(calcularIdade('2015-01-01', ref)).toBe(11);
    });

    it('deve calcular a idade a partir do formato brasileiro DD/MM/YYYY', () => {
      const ref = new Date(2026, 7, 26); // 26/08/2026
      expect(calcularIdade('15/01/2000', ref)).toBe(26);
      expect(calcularIdade('25/08/2008', ref)).toBe(18);
      expect(calcularIdade('27/08/2008', ref)).toBe(17);
    });

    it('deve retornar 0 para datas futuras ou inválidas', () => {
      expect(calcularIdade('2030-01-01', new Date(2026, 0, 1))).toBe(0);
      expect(calcularIdade('data_invalida', new Date())).toBe(0);
    });
  });

  describe('Integração de Schemas Zod com Regras Anti-Fraude e Maioridade', () => {
    it('deve validar SignDocumentSchema rejeitando nomes fraudulentos', () => {
      const validSignData = {
        token: 'tok_valid_test_123456789',
        otp_code: '123456',
        auth_health: 'yes',
        auth_data: 'yes',
        auth_image: 'yes',
        signer_name: 'Mateus Cotrim Silva',
        signer_cpf: '52998224725',
        signer_relationship: 'Pai',
        signer_phone: '(61) 99999-9999',
        signer_email: 'mateus@catraki.com.br',
        minor_name: 'Lucas Pereira Cotrim',
        minor_birth_date: '2008-01-10',
        minor_cpf: '12345678909',
        signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
      };

      const validResult = SignDocumentSchema.safeParse(validSignData);
      expect(validResult.success).toBe(true);

      // Nome fraudulento do signatário
      const invalidSignerName = { ...validSignData, signer_name: 'Gaga gaga' };
      const invalidResult1 = SignDocumentSchema.safeParse(invalidSignerName);
      expect(invalidResult1.success).toBe(false);

      // Nome fraudulento do estudante
      const invalidMinorName = { ...validSignData, minor_name: 'teste teste' };
      const invalidResult2 = SignDocumentSchema.safeParse(invalidMinorName);
      expect(invalidResult2.success).toBe(false);
    });

    it('deve aceitar "Próprio Estudante" no grau de parentesco para maiores de idade', () => {
      const studentSignData = {
        token: 'tok_valid_test_987654321',
        otp_code: '654321',
        auth_health: 'yes',
        auth_data: 'yes',
        auth_image: 'no',
        signer_name: 'Lucas Cotrim Silva',
        signer_cpf: '52998224725',
        signer_relationship: 'Próprio Estudante',
        signer_phone: '(61) 99999-9999',
        signer_email: 'lucas@catraki.com.br',
        minor_name: 'Lucas Cotrim Silva',
        minor_birth_date: '2000-01-10',
        minor_cpf: '52998224725',
        signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
      };

      const result = SignDocumentSchema.safeParse(studentSignData);
      expect(result.success).toBe(true);
    });

    it('deve validar CreateDocumentSchema com FullNameSchema', () => {
      const validCreate = {
        template_id: 'proc_oftalmologia',
        minor_name: 'Gabriel Alves Pereira',
        minor_birth_date: '2010-03-20',
        parent_name: 'Renata Alves Pereira',
        parent_email: 'renata@exemplo.com',
        parent_phone: '(61) 98888-7777',
      };
      expect(CreateDocumentSchema.safeParse(validCreate).success).toBe(true);

      const invalidCreate = {
        ...validCreate,
        parent_name: 'aaaa aaaa',
      };
      expect(CreateDocumentSchema.safeParse(invalidCreate).success).toBe(false);
    });
  });
});
