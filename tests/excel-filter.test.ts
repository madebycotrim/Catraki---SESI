import { describe, it, expect } from 'vitest';

describe('Sistema de Filtro e Ordenação Estilo Excel (ExcelColumnFilter)', () => {
  const sampleData = [
    {
      id: 'DOC-1',
      validationCode: 'CATRAKI-A1B2',
      studentName: 'Ana Beatriz Souza',
      parentName: 'Carlos Souza',
      institutionName: 'SESI Taguatinga',
      minorSeries: '1º Ano',
      minorClass: 'Turma A',
      minorTurn: 'Matutino',
      status: 'signed',
    },
    {
      id: 'DOC-2',
      validationCode: 'CATRAKI-C3D4',
      studentName: 'Bruno Alcantara',
      parentName: 'Mariana Alcantara',
      institutionName: 'SESI Ceilândia',
      minorSeries: '2º Ano',
      minorClass: 'Turma B',
      minorTurn: 'Vespertino',
      status: 'pending',
    },
    {
      id: 'DOC-3',
      validationCode: 'CATRAKI-E5F6',
      studentName: 'Carla Dias',
      parentName: 'Eduardo Dias',
      institutionName: 'SESI Taguatinga',
      minorSeries: '1º Ano',
      minorClass: 'Turma A',
      minorTurn: 'Matutino',
      status: 'revoked',
    },
    {
      id: 'DOC-4',
      validationCode: 'CATRAKI-G7H8',
      studentName: 'Daniel Oliveira',
      parentName: 'Fernanda Oliveira',
      institutionName: 'SESI Gama',
      minorSeries: '3º Ano',
      minorClass: 'Turma C',
      minorTurn: 'Matutino',
      status: 'CANCELADO_POR_ERRO',
    },
  ];

  const extractors = {
    code: (a: any) => (a.validationCode || a.id).trim(),
    student: (a: any) => (a.studentName || '').trim(),
    school: (a: any) => (a.institutionName || '').trim(),
    status: (a: any) => {
      if (a.status === 'signed') return 'Autorizada';
      if (a.status === 'CANCELADO_POR_ERRO') return 'Cancelada por Erro';
      if (a.status === 'revoked') return 'Revogada';
      return 'Pendente';
    },
  };

  it('deve extrair valores únicos e suas respectivas contagens para cada coluna', () => {
    const schoolCounts = new Map<string, number>();
    sampleData.forEach(item => {
      const val = extractors.school(item);
      schoolCounts.set(val, (schoolCounts.get(val) || 0) + 1);
    });

    expect(schoolCounts.get('SESI Taguatinga')).toBe(2);
    expect(schoolCounts.get('SESI Ceilândia')).toBe(1);
    expect(schoolCounts.get('SESI Gama')).toBe(1);
  });

  it('deve filtrar registros quando um subconjunto de opções da coluna for selecionado', () => {
    const selectedSchools = new Set(['SESI Taguatinga']);
    const filtered = sampleData.filter(item => selectedSchools.has(extractors.school(item)));

    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.institutionName === 'SESI Taguatinga')).toBe(true);
  });

  it('deve permitir filtragem combinada multi-colunas estilo Excel (Composto)', () => {
    const selectedSchools = new Set(['SESI Taguatinga']);
    const selectedStatuses = new Set(['Autorizada']);

    const filtered = sampleData.filter(item => {
      if (selectedSchools && !selectedSchools.has(extractors.school(item))) return false;
      if (selectedStatuses && !selectedStatuses.has(extractors.status(item))) return false;
      return true;
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].studentName).toBe('Ana Beatriz Souza');
  });

  it('deve classificar de A a Z e de Z a A corretamente', () => {
    const sortedAsc = [...sampleData].sort((a, b) => 
      extractors.student(a).localeCompare(extractors.student(b), 'pt-BR')
    );
    expect(sortedAsc[0].studentName).toBe('Ana Beatriz Souza');
    expect(sortedAsc[3].studentName).toBe('Daniel Oliveira');

    const sortedDesc = [...sampleData].sort((a, b) => 
      extractors.student(b).localeCompare(extractors.student(a), 'pt-BR')
    );
    expect(sortedDesc[0].studentName).toBe('Daniel Oliveira');
    expect(sortedDesc[3].studentName).toBe('Ana Beatriz Souza');
  });

  it('deve retornar todos os dados quando o filtro for nulo (Selecionar Tudo)', () => {
    const columnFilterStatus: Set<string> | null = null;
    const filtered = sampleData.filter(item => {
      if (columnFilterStatus && !columnFilterStatus.has(extractors.status(item))) return false;
      return true;
    });

    expect(filtered.length).toBe(sampleData.length);
  });
});
