import { describe, it, expect } from 'vitest';
import { querySesiMatricula } from '../src/lib/sesi-matricula.ts';

describe('Integração com a Base de Matrícula SESI (sesi-matricula.ts)', () => {
  it('deve confirmar vínculo existente entre aluno e responsável cadastrado presencialmente', async () => {
    const result = await querySesiMatricula({
      minorName: 'Lucas Cotrim Silva',
      minorBirthDate: '2010-05-14',
      signerCpf: '123.456.789-09',
      signerName: 'Mateus Cotrim',
    });

    expect(result.hasValidEnrollment).toBe(true);
    expect(result.guardianType).toBe('Pai');
    expect(result.matriculaCode).toBe('SESI-2024-8841');
    expect(result.verifiedAt).toBeDefined();
  });

  it('deve retornar não-localizado para CPF não vinculado (acionando fila de revisão manual)', async () => {
    const result = await querySesiMatricula({
      minorName: 'Lucas Cotrim Silva',
      minorBirthDate: '2010-05-14',
      signerCpf: '529.982.247-25', // CPF válido mas não vinculado a este menor
      signerName: 'Outro Responsável',
    });

    expect(result.hasValidEnrollment).toBe(false);
    expect(result.matriculaCode).toBeUndefined();
  });
});
