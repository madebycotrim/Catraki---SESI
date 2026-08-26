import {
  queryCatrakiMatricula,
  CatrakiEnrollmentQuery,
  CatrakiEnrollmentResult
} from './catraki-matricula.ts';

export type SesiEnrollmentQuery = CatrakiEnrollmentQuery;
export type SesiEnrollmentResult = CatrakiEnrollmentResult;

export async function querySesiMatricula(
  query: SesiEnrollmentQuery,
  apiEndpoint?: string,
  apiKey?: string
): Promise<SesiEnrollmentResult> {
  const result = await queryCatrakiMatricula(query, apiEndpoint, apiKey);
  return {
    hasValidEnrollment: result.hasValidEnrollment,
    guardianType: result.guardianType,
    matriculaCode: result.matriculaCode,
    verifiedAt: result.verifiedAt,
    source: 'sesi_sistema_academico_saude_v2',
  };
}
