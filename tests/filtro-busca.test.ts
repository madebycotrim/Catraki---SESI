import { describe, it, expect } from 'vitest';
import { verificarCorrespondenciaBusca } from '../src/components/admin/AdminDashboard.tsx';

describe('Filtro de Busca Rápida de Autorizações (AdminDashboard)', () => {
  const autorizacaoCaio = {
    id: 'DOC-20260902-215010',
    accessToken: 'cemeit-caio-2026',
    studentName: 'Caio Silva Santos',
    studentCpf: '058.***.***-**',
    studentCpfMasked: '058.***.***-**',
    studentCpfRaw: '05845678901',
    parentName: 'Renata Silva',
    parentCpfMasked: '812.***.***-**',
    parentCpfRaw: '81234567890',
    parentEmail: 'renata.silva@exemplo.com.br',
    institutionName: 'CEMEIT - Taguatinga',
    validationCode: 'SESI-2E87-9594',
    minorSeries: '1º Ano',
    minorClass: 'Turma A',
    minorTurn: 'matutino',
  };

  const autorizacaoNazare = {
    id: 'DOC-20260826-214139',
    accessToken: 'cemeit-nazare-2026',
    studentName: 'Nazare Souza',
    studentCpf: '078.***.***-**',
    studentCpfMasked: '078.***.***-**',
    studentCpfRaw: '07812345678',
    parentName: 'Carlos Souza',
    parentCpfMasked: '999.***.***-**',
    parentCpfRaw: '99912345678',
    parentEmail: 'carlos@exemplo.com.br',
    institutionName: 'CEMEIT - Taguatinga',
    validationCode: 'SESI-DOC-B1C2',
    minorSeries: '2º Ano',
    minorClass: 'Turma B',
    minorTurn: 'vespertino',
  };

  it('deve localizar o estudante quando pesquisado pelo prefixo do CPF "058"', () => {
    // Caso exato reportado pelo usuário: CPF 058 não aparecia
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '058')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, '058')).toBe(false);
  });

  it('deve localizar com pontuação no CPF "058."', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '058.')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, '058.')).toBe(false);
  });

  it('deve localizar por dígitos intermediários ou completos do CPF', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '058456')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '05845678901')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, '058456')).toBe(false);
  });

  it('deve localizar pelo nome do aluno independentemente de maiúsculas/minúsculas', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, 'caio')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, 'CAIO SILVA')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, 'caio')).toBe(false);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, 'nazare')).toBe(true);
  });

  it('deve localizar pelo código de validação SESI', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, 'SESI-2E87-9594')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '2E87')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, '2E87')).toBe(false);
  });

  it('deve localizar pelo CPF ou e-mail do responsável legal', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '812')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, 'renata.silva@exemplo.com.br')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, 'renata')).toBe(false);
  });

  it('deve retornar true para termo de busca vazio', () => {
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoCaio, '   ')).toBe(true);
    expect(verificarCorrespondenciaBusca(autorizacaoNazare, '')).toBe(true);
  });

  it('não deve causar falso positivo em timestamp interno de ID com números curtos', () => {
    // Garante que "058" não casa erroneamente com IDs arbitrários
    const authComTimestamp058 = {
      ...autorizacaoNazare,
      id: 'DOC-20260826-058123',
    };
    expect(verificarCorrespondenciaBusca(authComTimestamp058, '058')).toBe(false);
    // Mas deve encontrar se pesquisar pelo ID ou prefixo oficial
    expect(verificarCorrespondenciaBusca(authComTimestamp058, 'DOC-20260826')).toBe(true);
  });
});
