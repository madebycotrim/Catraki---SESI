import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../src/lib/api.ts';

describe('Prevenção de Duplicidade de Assinatura por Estudante', () => {
  beforeEach(() => {
    // Limpa storage para isolar os testes
    apiClient.resetLocalDb();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  });

  it('deve permitir primeira assinatura para um estudante', async () => {
    const studentCpf = '52998224725';
    const check = await apiClient.checkStudentDuplicate({
      minor_cpf: studentCpf,
      minor_name: 'Lucas Cotrim Silva',
      minor_birth_date: '2010-05-14',
    });

    expect(check.hasExistingSignature).toBe(false);
  });

  it('deve detectar e bloquear segunda assinatura para o mesmo estudante por CPF', async () => {
    const studentCpf = '52998224725';
    
    // 1. Obtém documento para assinar
    const docRes = await apiClient.getSignerDoc('token-teste-duplicidade-1');
    expect(docRes.success).toBe(true);

    // 2. Realiza a primeira assinatura com sucesso
    const signPayload = {
      token: 'token-teste-duplicidade-1',
      otp_code: '123456',
      signer_name: 'Mateus Cotrim',
      signer_cpf: '123.456.789-09',
      signer_relationship: 'Pai',
      signer_email: 'mateus@email.com',
      signer_phone: '(61) 99999-9999',
      minor_name: 'Lucas Cotrim Silva',
      minor_birth_date: '2010-05-14',
      minor_cpf: studentCpf,
      signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent_lgpd_art11_art14: true as const,
      declaration_art299_penal: true as const,
      declaration_legal_responsibility: true as const,
    };

    const firstSign = await apiClient.signDocument(signPayload);
    expect(firstSign.success).toBe(true);

    // 3. Verifica se a duplicidade é detectada ao consultar o estudante
    const dupCheck = await apiClient.checkStudentDuplicate({
      minor_cpf: studentCpf,
      minor_name: 'Lucas Cotrim Silva',
      minor_birth_date: '2010-05-14',
    });

    expect(dupCheck.hasExistingSignature).toBe(true);
    expect(dupCheck.existingValidationCode).toMatch(/^CATRAKI-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(dupCheck.minorName).toBe('Lucas Cotrim Silva');
    expect(dupCheck.signerNameMasked).toBe('Mateus C***');

    // 4. Tenta assinar um segundo documento para o mesmo aluno e valida bloqueio
    await apiClient.getSignerDoc('token-teste-duplicidade-2');
    const secondSign = await apiClient.signDocument({
      ...signPayload,
      token: 'token-teste-duplicidade-2',
      signer_name: 'Maria Cotrim',
      signer_relationship: 'Mãe',
    });

    expect(secondSign.success).toBe(false);
    expect(secondSign.code).toBe('STUDENT_ALREADY_SIGNED');
    expect(secondSign.existing_validation_code).toBeDefined();
  });

  it('deve permitir que o MESMO responsável assine para múltiplos filhos (CPFs de estudantes distintos)', async () => {
    const parentCpf = '123.456.789-09';
    const parentEmail = 'responsavel@exemplo.com';
    const student1Cpf = '52998224725';
    const student2Cpf = '12345678909';

    // 1. Assinatura para o Filho 1
    await apiClient.getSignerDoc('token-filho-1');
    const signFilho1 = await apiClient.signDocument({
      token: 'token-filho-1',
      otp_code: '123456',
      signer_name: 'Mateus Cotrim',
      signer_cpf: parentCpf,
      signer_relationship: 'Pai',
      signer_email: parentEmail,
      signer_phone: '(61) 99999-9999',
      minor_name: 'Lucas Cotrim Silva',
      minor_birth_date: '2010-05-14',
      minor_cpf: student1Cpf,
      signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent_lgpd_art11_art14: true as const,
      declaration_art299_penal: true as const,
      declaration_legal_responsibility: true as const,
    });
    expect(signFilho1.success).toBe(true);

    // 2. Consulta duplicidade do Filho 2 (deve estar livre)
    const checkFilho2 = await apiClient.checkStudentDuplicate({
      minor_cpf: student2Cpf,
      minor_name: 'Sofia Cotrim Silva',
      minor_birth_date: '2012-08-20',
    });
    expect(checkFilho2.hasExistingSignature).toBe(false);

    // 3. O MESMO PAI assina para o Filho 2 com sucesso
    await apiClient.getSignerDoc('token-filho-2');
    const signFilho2 = await apiClient.signDocument({
      token: 'token-filho-2',
      otp_code: '123456',
      signer_name: 'Mateus Cotrim',
      signer_cpf: parentCpf,
      signer_relationship: 'Pai',
      signer_email: parentEmail,
      signer_phone: '(61) 99999-9999',
      minor_name: 'Sofia Cotrim Silva',
      minor_birth_date: '2012-08-20',
      minor_cpf: student2Cpf,
      signature_png_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent_lgpd_art11_art14: true as const,
      declaration_art299_penal: true as const,
      declaration_legal_responsibility: true as const,
    });
    expect(signFilho2.success).toBe(true);
    expect(signFilho2.document_id).toBeDefined();

    // 4. Agora ambos os filhos estão assinados e protegidos individualmente contra duplicidade
    const recheckFilho1 = await apiClient.checkStudentDuplicate({ minor_cpf: student1Cpf });
    const recheckFilho2 = await apiClient.checkStudentDuplicate({ minor_cpf: student2Cpf });
    expect(recheckFilho1.hasExistingSignature).toBe(true);
    expect(recheckFilho2.hasExistingSignature).toBe(true);
    expect(recheckFilho1.existingValidationCode).not.toBe(recheckFilho2.existingValidationCode);
  });
});
