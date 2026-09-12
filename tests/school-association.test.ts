import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../src/lib/api.ts';
import { signerRouter } from '../functions/routes/signer.ts';

describe('Associação Correta de Escola e URL (Prevenção de Fallback Incorreto para CEMEIT)', () => {
  beforeEach(() => {
    apiClient.resetLocalDb();
  });

  it('deve associar o termo à escola informada na URL (ex: ced01-estrutural) e NÃO à escola padrão', async () => {
    const mockEscola = {
      id: 'ced01-estrutural',
      name: 'Centro Educacional 01 da Estrutural',
      short_name: 'CED 01',
      city: 'Estrutural',
      state: 'DF',
      is_active: 1,
    };

    const mockTemplate = {
      id: 'proc_escola_cidada',
      version: 1,
      title: 'Escola Cidadã: Saúde em Movimento',
      procedure_description: 'Descrição oficial',
      content_markdown: '## Termo Oficial',
      content_sha256: '5d98b3c1ad95490eba3b6339902569637cb26659bbaefc481b6e8c9edf5261da',
      consent_text_version: 1,
      is_active: 1,
    };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
          first: async () => {
            if (sql.includes('FROM documents')) return null;
            if (sql.includes('institutions')) return mockEscola;
            if (sql.includes('document_templates')) return mockTemplate;
            return null;
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
        first: async () => {
          if (sql.includes('FROM documents')) return null;
          if (sql.includes('institutions')) return mockEscola;
          if (sql.includes('document_templates')) return mockTemplate;
          return null;
        },
      }),
    };

    // 1. Acesso pela URL da escola /autorizar/ced01-estrutural
    const resDoc = await signerRouter.request('/doc/ced01-estrutural', { method: 'GET' }, { DB: mockDb as any });
    expect(resDoc.status).toBe(200);
    const docData = await resDoc.json() as any;
    expect(docData.success).toBe(true);
    expect(docData.document.institution_id).toBe('ced01-estrutural');
    expect(docData.document.institution_name).toBe('Centro Educacional 01 da Estrutural');
    expect(docData.document.access_token).toContain('ced01-estrutural');
  });

  it('no cliente local/contingência, carregar e assinar para ced01-estrutural deve manter Centro Educacional 01 da Estrutural', async () => {
    // 1. Carrega documento para ced01-estrutural
    const resDoc = await apiClient.getSignerDoc('ced01-estrutural');
    expect(resDoc.success).toBe(true);
    expect(resDoc.document.institution_id).toBe('ced01-estrutural');
    expect(resDoc.document.institution_name).toBe('Centro Educacional 01 da Estrutural');

    // 2. Solicita OTP passando school_slug
    const resOtp = await apiClient.requestOtp(
      resDoc.document.id,
      'email',
      'responsavel.teste@gmail.com',
      'Estudante da Silva',
      undefined,
      undefined,
      'ced01-estrutural',
      'Centro Educacional 01 da Estrutural'
    );
    expect(resOtp.success).toBe(true);

    // 3. Assina documento enviando school_slug e institution_id
    const resSign = await apiClient.signDocument({
      token: resDoc.document.id,
      otp_code: '123456',
      signer_name: 'Maria da Silva Santos',
      signer_cpf: '88722344153',
      signer_relationship: 'Mãe',
      signer_email: 'responsavel.teste@gmail.com',
      minor_name: 'Estudante da Silva',
      minor_birth_date: '2010-05-15',
      minor_cpf: '01234567890',
      minor_series: '9º Ano',
      minor_class: 'B',
      minor_turn: 'Matutino',
      school_slug: 'ced01-estrutural',
      institution_id: 'ced01-estrutural',
      institution_name: 'Centro Educacional 01 da Estrutural',
      auth_health: 'yes',
      auth_data: 'yes',
      auth_image: 'yes',
      signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent_lgpd_art11_art14: true,
      declaration_art299_penal: true,
      declaration_legal_responsibility: true,
    });

    expect(resSign.success).toBe(true);

    // 4. Verifica se o documento persistido localmente possui o vínculo com a escola correta
    const storedDoc = apiClient.getLocalDocument(resDoc.document.id);
    expect(storedDoc).not.toBeNull();
    expect((storedDoc as any).institution_id).toBe('ced01-estrutural');
    expect((storedDoc as any).institution_name).toBe('Centro Educacional 01 da Estrutural');
  });
});
