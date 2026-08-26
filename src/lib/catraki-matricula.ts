// ============================================================================
// CLIENTE DE INTEGRAÇÃO COM A BASE DE MATRÍCULA DO CATRAKI
// Validação de vínculo prévio entre Aluno/Beneficiário e Responsável Legal
// ============================================================================

export interface CatrakiEnrollmentQuery {
  minorName: string;
  minorBirthDate: string; // AAAA-MM-DD
  signerCpf: string;
  signerName: string;
}

export interface CatrakiEnrollmentResult {
  hasValidEnrollment: boolean;
  guardianType?: 'Pai' | 'Mãe' | 'Tutor Legal' | 'Responsável por Guarda Judicial';
  matriculaCode?: string;
  verifiedAt: string;
  source: 'catraki_sistema_academico_v2';
}

/**
 * Base de dados mockada institucional para testes e demonstração do fluxo
 * Em produção: substituído por chamada REST/SOAP mTLS interna.
 */
const MOCK_CATRAKI_DATABASE = [
  {
    minorName: 'Lucas Cotrim Silva',
    minorBirthDate: '2010-05-14',
    parentCpfClean: '12345678909',
    parentName: 'Mateus Cotrim',
    guardianType: 'Pai' as const,
    matriculaCode: 'CATRAKI-2024-8841',
  },
  {
    minorName: 'Sofia Andrade Ramos',
    minorBirthDate: '2012-08-22',
    parentCpfClean: '98765432100',
    parentName: 'Mariana Andrade Ramos',
    guardianType: 'Mãe' as const,
    matriculaCode: 'CATRAKI-2024-9120',
  },
  {
    minorName: 'Gabriel Souza Lima',
    minorBirthDate: '2015-03-10',
    parentCpfClean: '11144477735',
    parentName: 'Carlos Souza Lima',
    guardianType: 'Pai' as const,
    matriculaCode: 'CATRAKI-2024-3042',
  },
];

/**
 * Consulta a base de matrícula Catraki com tempo de resposta constante
 * Previne enumeração de dados pessoais e timing attacks.
 */
export async function queryCatrakiMatricula(
  query: CatrakiEnrollmentQuery,
  apiEndpoint?: string,
  apiKey?: string
): Promise<CatrakiEnrollmentResult> {
  const startTime = Date.now();
  const cleanCpf = query.signerCpf.replace(/\D/g, '');
  const cleanMinorName = query.minorName.trim().toLowerCase();

  let hasMatch = false;
  let guardianType: CatrakiEnrollmentResult['guardianType'] = undefined;
  let matriculaCode: string | undefined = undefined;

  // 1. Caso haja endpoint corporativo configurado via mTLS / API Key:
  if (apiEndpoint && !apiEndpoint.includes('localhost')) {
    try {
      const resp = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Catraki-Client-Id': 'catraki-saude-worker',
        },
        body: JSON.stringify({
          cpf_responsavel: cleanCpf,
          nome_menor: query.minorName,
          data_nascimento_menor: query.minorBirthDate,
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        hasMatch = Boolean(data.vinculo_confirmado);
        guardianType = data.grau_parentesco;
        matriculaCode = data.codigo_matricula;
      }
    } catch {
      hasMatch = false;
    }
  } else {
    // 2. Modo Demonstração / Homologação com base controlada
    const match = MOCK_CATRAKI_DATABASE.find((item) => {
      const minorNameMatch = item.minorName.toLowerCase() === cleanMinorName;
      const birthMatch = item.minorBirthDate === query.minorBirthDate;
      const cpfMatch = item.parentCpfClean === cleanCpf;
      return minorNameMatch && birthMatch && cpfMatch;
    });

    if (match) {
      hasMatch = true;
      guardianType = match.guardianType;
      matriculaCode = match.matriculaCode;
    }
  }

  // 3. Mitigação de timing attack: padroniza latência mínima (~180ms)
  const elapsed = Date.now() - startTime;
  const targetLatency = 180;
  if (elapsed < targetLatency) {
    await new Promise((resolve) => setTimeout(resolve, targetLatency - elapsed));
  }

  return {
    hasValidEnrollment: hasMatch,
    guardianType,
    matriculaCode,
    verifiedAt: new Date().toISOString(),
    source: 'catraki_sistema_academico_v2',
  };
}
