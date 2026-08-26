import { describe, it, expect } from 'vitest';
import {
  isValidCPF,
  maskCPF,
  maskPhone,
  maskEmail,
  maskName,
  getInitials,
  CreateDocumentSchema,
  SignDocumentSchema,
} from '../src/lib/schemas.ts';

describe('Validações e Schemas Zod (schemas.ts)', () => {
  it('deve validar CPFs oficiais da Receita Federal corretamente', () => {
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('12345678909')).toBe(true);
    expect(isValidCPF('123.456.789-09')).toBe(true);

    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('00000000000')).toBe(false);
    expect(isValidCPF('99999999999')).toBe(false);

    expect(isValidCPF('12345678900')).toBe(false);
    expect(isValidCPF('12345678999')).toBe(false);
    expect(isValidCPF('')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });

  it('deve aplicar máscaras de privacidade (LGPD) corretamente', () => {
    expect(maskCPF('12345678909')).toBe('123.***.***-09');
    expect(maskEmail('mateus.cotrim@sesi.org.br')).toBe('ma***@sesi.org.br');
    expect(maskPhone('11987654321')).toBe('(11) *****-4321');
    expect(getInitials('Lucas Cotrim Silva')).toBe('Lucas C. S.');
    expect(getInitials('Sofia')).toBe('Sofia');
    expect(maskName('Mateus Cotrim')).toBe('Mateus C***');
    expect(maskName('Maria Silva Santos')).toBe('Maria S***');
  });

  it('deve validar schema de emissão de documento', () => {
    const validDoc = {
      template_id: 'proc_audiometria_infantil',
      minor_name: 'Lucas Cotrim Silva',
      minor_birth_date: '2010-05-14',
      parent_name: 'Mateus Cotrim',
      parent_email: 'mateus@exemplo.com',
      parent_phone: '(11) 98765-4321',
      expires_in_days: 7,
    };

    const result = CreateDocumentSchema.safeParse(validDoc);
    expect(result.success).toBe(true);

    const invalidDoc = {
      template_id: '',
      minor_name: 'Lu',
      minor_birth_date: '14/05/2010',
      parent_name: '',
      parent_email: 'invalido',
      parent_phone: '123',
    };

    const invalidResult = CreateDocumentSchema.safeParse(invalidDoc);
    expect(invalidResult.success).toBe(false);
  });

  it('deve validar schema de assinatura com exigência de consentimento LGPD Art. 11/14 e Art. 299 CP', () => {
    const validSign = {
      token: 'demo-token-sesi-audiometria-2026',
      otp_code: '123456',
      signer_name: 'Mateus Cotrim',
      signer_cpf: '123.456.789-09',
      signer_relationship: 'Pai',
      signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent_lgpd_art11_art14: true,
      declaration_art299_penal: true,
      declaration_legal_responsibility: true,
      minor_cpf: '123.456.789-09',
    };

    const result = SignDocumentSchema.safeParse(validSign);
    expect(result.success).toBe(true);

    const withoutConsent = {
      ...validSign,
      consent_lgpd_art11_art14: false,
    };

    const withoutConsentResult = SignDocumentSchema.safeParse(withoutConsent);
    expect(withoutConsentResult.success).toBe(false);
  });

  it('deve aceitar todas as opções válidas de representação legal e parentesco', () => {
    const relationships = [
      'Pai',
      'Mãe',
      'Tutor Legal',
      'Tutor(a) Legal',
      'Responsável por Guarda Judicial',
      'Guarda Judicial',
      'Avô/Avó',
      'Avô / Avó',
      'Tio/Tia',
      'Tio / Tia',
      'Outro',
      'Outro Responsável Legal',
    ];

    for (const rel of relationships) {
      const payload = {
        token: 'demo-token-sesi-audiometria-2026',
        otp_code: '123456',
        signer_name: 'Mateus Cotrim',
        signer_cpf: '123.456.789-09',
        signer_relationship: rel,
        signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
        minor_cpf: '123.456.789-09',
      };
      const res = SignDocumentSchema.safeParse(payload);
      expect(res.success).toBe(true);
    }
  });

  it('deve validar documentos públicos usando múltiplos formatos de código (CATRAKI, SESI, Hash)', async () => {
    const { apiClient } = await import('../src/lib/api.ts');

    const manifestHash = '7541abcdef0123456789abcdef0123456789abcdef0123456789abcdef01e01c';
    const mockDoc = {
      id: 'DOC-20260826-7541E01C',
      template_id: 'proc_audiometria_infantil',
      template_version: 1,
      access_token: 'token-7541e01c',
      status: 'signed' as const,
      minor_name: 'Gabriela Alvarenga Teles',
      minor_cpf: '099.123.456-10',
      parent_name: 'Editania Ferreira Teles',
      manifest_sha256: manifestHash,
      validation_code: 'CATRAKI-7541-E01C',
      created_at: new Date().toISOString(),
    };

    apiClient.seedDocument(mockDoc);

    // Validação com formato CATRAKI-XXXX-XXXX
    const resCatraki = await apiClient.validatePublic('CATRAKI-7541-E01C');
    expect(resCatraki.success).toBe(true);
    expect(resCatraki.validation?.document_id).toBe(mockDoc.id);

    // Validação com formato SESI-XXXX-XXXX
    const resSesi = await apiClient.validatePublic('SESI-7541-E01C');
    expect(resSesi.success).toBe(true);

    // Validação com formato sem prefixo (7541-E01C)
    const resShort = await apiClient.validatePublic('7541-E01C');
    expect(resShort.success).toBe(true);

    // Validação por ID do documento
    const resId = await apiClient.validatePublic('DOC-20260826-7541E01C');
    expect(resId.success).toBe(true);
  });
});
