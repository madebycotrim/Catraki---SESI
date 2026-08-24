import { z } from 'zod';

// ============================================================================
// VALIDADOR OFICIAL DE CPF (ALGORITMO DA RECEITA FEDERAL DO BRASIL)
// ============================================================================
export function isValidCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false;
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  // Rejeita sequências de dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Cálculo do 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  let d1 = (rev === 10 || rev === 11) ? 0 : rev;
  if (d1 !== parseInt(cpf.charAt(9), 10)) return false;

  // Cálculo do 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  let d2 = (rev === 10 || rev === 11) ? 0 : rev;
  return d2 === parseInt(cpf.charAt(10), 10);
}

export function maskCPF(cpfRaw: string): string {
  const digits = cpfRaw.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

export function maskPhone(phoneRaw?: string): string {
  if (!phoneRaw) return '';
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) *****-${digits.slice(7)}`;
  }
  return '(**) *****-****';
}

export function maskEmail(emailRaw?: string): string {
  if (!emailRaw) return '';
  const parts = emailRaw.split('@');
  if (parts.length !== 2) return '***@***.***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`;
  return `${maskedName}@${domain}`;
}

/**
 * Formata o nome do menor exibindo o primeiro nome completo seguido das iniciais dos demais sobrenomes com ponto (ex: 'Lucas G. S.')
 * Atende às diretrizes de privacidade e minimização de dados da LGPD (Art. 14).
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return 'Estudante';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Estudante';
  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const middleAndLastInitials = parts
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ');

  return `${firstName} ${middleAndLastInitials}`;
}

/**
 * Converte o cabeçalho técnico de User-Agent em um nome amigável de Navegador e Sistema Operacional.
 */
export function formatUserAgent(ua?: string): string {
  if (!ua) return 'Dispositivo não identificado';

  let browser = 'Navegador Web';
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = match ? `Microsoft Edge ${match[1].split('.')[0]}` : 'Microsoft Edge';
  } else if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = match ? `Google Chrome ${match[1].split('.')[0]}` : 'Google Chrome';
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = match ? `Mozilla Firefox ${match[1].split('.')[0]}` : 'Mozilla Firefox';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = match ? `Apple Safari ${match[1].split('.')[0]}` : 'Apple Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera';
  }

  let os = 'Sistema';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11 (64-bit)';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Android')) {
    const match = ua.match(/Android ([\d.]+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (ua.includes('iPhone')) os = 'iOS (iPhone)';
  else if (ua.includes('iPad')) os = 'iPadOS (iPad)';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} no ${os}`;
}

/**
 * Gera um identificador de protocolo único para o documento com base na data e hora exata (Timestamp)
 * Formato: DOC-YYYYMMDD-HHMMSS (Ex: DOC-20260821-005312)
 */
export function generateUniqueDocId(prefix = 'DOC'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${datePart}-${timePart}`;
}

// ============================================================================
// SCHEMAS DE VALIDAÇÃO ZOD
// ============================================================================

export const CPFSchema = z.string()
  .min(11, 'CPF deve conter no mínimo 11 dígitos')
  .max(14, 'CPF inválido')
  .refine(isValidCPF, { message: 'Número de CPF inválido perante o algoritmo oficial da Receita Federal' });

export const RelationshipSchema = z.enum([
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
  'Outro Responsável Legal'
], {
  errorMap: () => ({ message: 'Grau de parentesco ou representação legal inválido' })
});

export const CreateTemplateSchema = z.object({
  id: z.string().min(3).max(64).regex(/^[a-z0-9_-]+$/i, 'ID deve ser alfanumérico'),
  title: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(200),
  procedure_description: z.string().min(20, 'Descrição do procedimento médico deve ser clara e detalhada'),
  content_markdown: z.string().min(50, 'Texto completo do termo é obrigatório'),
  retention_days: z.number().int().min(30).max(7300).default(1825),
});

export const CreateDocumentSchema = z.object({
  template_id: z.string().min(1, 'Template de procedimento é obrigatório'),
  template_version: z.number().int().positive().optional(),
  minor_name: z.string().min(3, 'Nome completo do menor é obrigatório').max(150),
  minor_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato AAAA-MM-DD'),
  parent_name: z.string().min(3, 'Nome do responsável é obrigatório').max(150),
  parent_email: z.string().email('E-mail do responsável inválido'),
  parent_phone: z.string().min(10).max(15).regex(/^\+?[0-9\s()-]+$/, 'Telefone celular inválido'),
  expires_in_days: z.number().int().min(1).max(30).default(7),
});

export const VerifyMatriculaSchema = z.object({
  token: z.string().min(16),
  signer_cpf: CPFSchema,
  signer_name: z.string().min(3).max(150),
  signer_relationship: RelationshipSchema,
});

export const ManualReviewUploadSchema = z.object({
  token: z.string().min(16),
  signer_name: z.string().min(3).max(150),
  signer_cpf: CPFSchema,
  signer_relationship: RelationshipSchema,
  identity_doc_base64: z.string().min(100, 'Documento de identidade é obrigatório'),
  selfie_base64: z.string().min(100, 'Selfie com documento é obrigatória'),
  guardianship_doc_base64: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const OtpRequestSchema = z.object({
  token: z.string().min(16),
  channel: z.enum(['sms', 'email']).default('email'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  minor_name: z.string().optional(),
});

export const OtpVerifySchema = z.object({
  token: z.string().min(16),
  otp_code: z.string().regex(/^\d{6}$/, 'O código OTP deve possuir exatamente 6 dígitos numéricos'),
});

export const SignDocumentSchema = z.object({
  token: z.string().min(16),
  otp_code: z.string().regex(/^\d{6}$/, 'Código OTP inválido'),
  signer_name: z.string().min(3).max(150),
  signer_cpf: CPFSchema,
  signer_relationship: RelationshipSchema,
  signer_email: z.string().email().optional(),
  minor_name: z.string().optional(),
  minor_birth_date: z.string().optional(),
  minor_cpf: z.string().min(1, 'O CPF do estudante é obrigatório').refine((val) => isValidCPF(val), { message: 'CPF do menor inválido perante o algoritmo oficial' }),
  minor_series: z.string().optional(),
  minor_class: z.string().optional(),
  minor_turn: z.string().optional(),
  signer_phone: z.string().optional(),
  signer_address: z.string().optional(),
  institution_name: z.string().optional(),
  auth_health: z.enum(['yes', 'no']).optional(),
  auth_data: z.enum(['yes', 'no']).optional(),
  auth_image: z.enum(['yes', 'no']).optional(),
  signature_png_base64: z.string()
    .min(10, 'Assinatura obrigatória')
    .refine((val) => val.startsWith('data:image/png;base64,') || val.length < 500000, {
      message: 'A imagem da assinatura excede o limite máximo permitido de 500KB',
    }),
  consent_lgpd_art11_art14: z.literal(true, {
    errorMap: () => ({ message: 'É obrigatório declarar consentimento expresso e específico nos termos dos Arts. 11 e 14 da LGPD' })
  }),
  declaration_art299_penal: z.literal(true, {
    errorMap: () => ({ message: 'É obrigatório firmar a declaração de veracidade sob as penas do Art. 299 do Código Penal' })
  }),
  declaration_legal_responsibility: z.literal(true, {
    errorMap: () => ({ message: 'É obrigatório declarar que é o responsável legal e reconhecer a validade jurídica da assinatura' })
  }),
  client_fingerprint: z.string().max(256).optional(),
});

export const RevokeConsentSchema = z.object({
  token: z.string().min(16),
  reason: z.string().min(10, 'A justificativa de revogação deve conter no mínimo 10 caracteres').max(1000),
  confirm_legal_consequence: z.literal(true, {
    errorMap: () => ({ message: 'É obrigatório declarar ciência de que a revogação não desfaz atos médicos já executados' })
  }),
});

export const LgpdRequestPublicSchema = z.object({
  requester_name: z.string().min(3).max(150),
  requester_cpf: CPFSchema,
  requester_email: z.string().email(),
  request_type: z.enum(['access', 'rectification', 'deletion', 'revocation_appeal']),
  details: z.string().min(15, 'Forneça detalhes suficientes sobre a sua solicitação').max(2000),
});

export const ManualReviewActionSchema = z.object({
  review_id: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});
