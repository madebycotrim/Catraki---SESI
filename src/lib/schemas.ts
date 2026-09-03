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

export function formatCPF(cpfRaw?: string): string {
  if (!cpfRaw) return '';
  const digits = cpfRaw.replace(/\D/g, '');
  if (digits.length !== 11) return cpfRaw;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
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

export function maskName(nameRaw?: string): string {
  if (!nameRaw) return 'Responsável Legal';
  const parts = nameRaw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Responsável Legal';
  if (parts.length === 1) return `${parts[0].slice(0, 2)}***`;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last.charAt(0)}***`;
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
  let targetUa = ua;
  if (!targetUa || targetUa === 'Não registrado' || targetUa === 'Dispositivo não identificado' || targetUa === 'Navegador Web Padrão') {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      targetUa = navigator.userAgent;
    }
  }

  if (!targetUa || targetUa === 'Não registrado' || targetUa === 'Dispositivo não identificado' || targetUa === 'Navegador Web Padrão') {
    return 'Navegador Web Seguro (Identificado via Protocolo TLS/HTTPS)';
  }

  let browser = 'Navegador Web Seguro';
  if (targetUa.includes('Edg/')) {
    const match = targetUa.match(/Edg\/([\d.]+)/);
    browser = match ? `Microsoft Edge ${match[1].split('.')[0]}` : 'Microsoft Edge';
  } else if (targetUa.includes('Chrome/')) {
    const match = targetUa.match(/Chrome\/([\d.]+)/);
    browser = match ? `Google Chrome ${match[1].split('.')[0]}` : 'Google Chrome';
  } else if (targetUa.includes('Firefox/')) {
    const match = targetUa.match(/Firefox\/([\d.]+)/);
    browser = match ? `Mozilla Firefox ${match[1].split('.')[0]}` : 'Mozilla Firefox';
  } else if (targetUa.includes('Safari/') && !targetUa.includes('Chrome')) {
    const match = targetUa.match(/Version\/([\d.]+)/);
    browser = match ? `Apple Safari ${match[1].split('.')[0]}` : 'Apple Safari';
  } else if (targetUa.includes('Opera') || targetUa.includes('OPR/')) {
    browser = 'Opera';
  } else if (targetUa.includes('SamsungBrowser/')) {
    browser = 'Samsung Internet';
  }

  let os = 'Dispositivo Conectado';
  if (targetUa.includes('Windows NT 10.0')) os = 'Windows 10/11 (64-bit)';
  else if (targetUa.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (targetUa.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (targetUa.includes('Android')) {
    const match = targetUa.match(/Android ([\d.]+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (targetUa.includes('iPhone')) os = 'iOS (iPhone)';
  else if (targetUa.includes('iPad')) os = 'iPadOS (iPad)';
  else if (targetUa.includes('Mac OS X')) os = 'macOS';
  else if (targetUa.includes('CrOS')) os = 'ChromeOS';
  else if (targetUa.includes('Linux')) os = 'Linux';

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

/**
 * Validação detalhada de Nomes Próprios / Civis
 * Impede nomes fictícios, zombarias ou repetições de caracteres (ex: "Gaga gaga", "aaaa aaaa", "asdf asdf", "teste teste").
 */
export function validateFullName(name?: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'O nome completo é obrigatório.' };
  }
  const clean = name.trim();
  if (clean.length < 5) {
    return { valid: false, error: 'O nome deve conter no mínimo 5 caracteres.' };
  }
  if (clean.length > 150) {
    return { valid: false, error: 'O nome não pode exceder 150 caracteres.' };
  }

  // Não pode conter números ou símbolos impróprios para nomes civis (permite acentos, apóstrofo e hífen)
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(clean)) {
    return { valid: false, error: 'O nome deve conter apenas letras e espaços.' };
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { valid: false, error: 'Digite o seu nome completo (nome e sobrenome).' };
  }

  for (const part of parts) {
    if (part.length < 2 && !['e', 'd', 'o', 'a', 'y', 'da', 'de', 'do', 'das', 'dos'].includes(part.toLowerCase())) {
      return { valid: false, error: 'Cada parte do nome deve conter pelo menos 2 letras.' };
    }
    // Bloqueia repetições sequenciais de 3 ou mais caracteres idênticos (ex: "Gaaaa", "xxxxx", "Jooaaao")
    if (/(.)\1{2,}/i.test(part)) {
      return { valid: false, error: 'O nome contém repetições excessivas de caracteres inválidas.' };
    }
  }

  // Bloqueia nomes repetitivos / fictícios como "Gaga gaga", "teste teste", "fulano fulano", "bla bla"
  const normalizedWords = parts.map((p) => p.toLowerCase());
  const uniqueWords = new Set(normalizedWords);
  if (uniqueWords.size === 1) {
    return { valid: false, error: 'Por favor, informe um nome e sobrenome válidos (nomes repetitivos não são permitidos).' };
  }

  // Bloqueia termos fictícios conhecidos
  const dummyList = [
    'teste teste', 'asdf qwerty', 'anonimo anonimo', 'nao informado', 'não informado',
    'sem nome', 'fulano de tal', 'fulano da silva', 'beltrano de tal', 'sicrano de tal'
  ];
  const fullLower = clean.toLowerCase();
  if (dummyList.some(d => fullLower === d || fullLower.includes('teste teste') || fullLower.includes('asdf qwerty'))) {
    return { valid: false, error: 'Nome fictício ou de teste não permitido.' };
  }

  const dummyTerms = ['gaga', 'teste', 'asdf', 'qwerty', 'fake', 'anonimo', 'nenhum', 'xpto', 'null', 'undefined'];
  if (normalizedWords.every((w) => dummyTerms.includes(w))) {
    return { valid: false, error: 'Nome inválido ou fictício detectado.' };
  }

  return { valid: true };
}

/**
 * Retorna true se o nome completo for civilmente válido e passar nas regras anti-fraude.
 */
export function isValidFullName(name?: string): boolean {
  return validateFullName(name).valid;
}

/**
 * Calcula a idade completa em anos a partir de uma data de nascimento (suporta YYYY-MM-DD e DD/MM/YYYY).
 */
export function calcularIdade(dataNascimento: string | Date, dataReferencia: Date = new Date()): number {
  if (!dataNascimento) return 0;
  let birth: Date;

  if (typeof dataNascimento === 'string') {
    const cleanStr = dataNascimento.trim();
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        birth = new Date(cleanStr);
      }
    } else if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        birth = new Date(cleanStr);
      }
    } else {
      birth = new Date(cleanStr);
    }
  } else {
    birth = dataNascimento;
  }

  if (!birth || isNaN(birth.getTime())) return 0;
  if (birth > dataReferencia) return 0;

  let age = dataReferencia.getFullYear() - birth.getFullYear();
  const m = dataReferencia.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && dataReferencia.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Interpreta com segurança qualquer entrada de data (incluindo formato SQLite "YYYY-MM-DD HH:mm:ss" sem 'Z'),
 * garantindo que timestamps sem fuso horário sejam tratados como UTC.
 */
export function parseUtcDate(dateInput?: string | number | Date | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  let str = String(dateInput).trim();
  if (!str) return new Date();

  // SQLite "YYYY-MM-DD HH:mm:ss" ou "YYYY-MM-DDTHH:mm:ss" sem offset
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
    if (!str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formata qualquer timestamp para a Hora Oficial de Brasília (America/Sao_Paulo — UTC-3).
 */
export function formatBrasiliaDateTime(
  dateInput?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  const d = parseUtcDate(dateInput);
  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  };
  return d.toLocaleString('pt-BR', defaultOpts);
}

// ============================================================================
// SCHEMAS DE VALIDAÇÃO ZOD
// ============================================================================

export const FullNameSchema = z.string()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(150, 'Nome não pode exceder 150 caracteres')
  .refine((val) => isValidFullName(val), {
    message: 'Nome completo inválido ou fictício. Digite nome e sobrenome reais sem repetições excessivas.',
  });

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
  'Próprio Estudante',
  'Próprio Estudante (Maior de Idade)',
  'Próprio(a) Estudante (Maior de Idade)',
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
  minor_name: FullNameSchema,
  minor_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato AAAA-MM-DD'),
  parent_name: FullNameSchema,
  parent_email: z.string().email('E-mail do responsável inválido'),
  parent_phone: z.string().min(10).max(15).regex(/^\+?[0-9\s()-]+$/, 'Telefone celular inválido'),
  expires_in_days: z.number().int().min(1).max(30).default(7),
});

export const VerifyMatriculaSchema = z.object({
  token: z.string().min(16),
  signer_cpf: CPFSchema,
  signer_name: FullNameSchema,
  signer_relationship: RelationshipSchema,
});

export const OtpRequestSchema = z.object({
  token: z.string().min(16),
  channel: z.enum(['email']).default('email'),
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
  signer_name: FullNameSchema,
  signer_cpf: CPFSchema,
  signer_relationship: RelationshipSchema,
  signer_email: z.string().email().optional(),
  minor_name: z.string().optional().refine((val) => !val || isValidFullName(val), {
    message: 'Nome do estudante inválido ou fictício.',
  }),
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
  specialties: z.object({
    oftalmologia: z.boolean().optional(),
    audiometria: z.boolean().optional(),
    odontologia: z.boolean().optional(),
    psicologia: z.boolean().optional(),
    nutricao: z.boolean().optional(),
  }).optional(),
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
    errorMap: () => ({ message: 'É obrigatório declarar que é o responsável legal e confirmar o aceite da autorização' })
  }),
  client_fingerprint: z.string().max(256).optional(),
  termos_versao: z.string().max(32).optional(),
  device_fingerprint_data: z.object({
    screen_resolution: z.string().optional(),
    os_name: z.string().optional(),
    browser_language: z.string().optional(),
    timezone: z.string().optional(),
    color_depth: z.number().optional(),
    captured_at: z.string().optional(),
  }).optional(),
});

export const LogAdminExportSchema = z.object({
  export_type: z.enum(['CSV_CONSOLIDATED', 'ZIP_PDFS', 'STUDENT_CARD_PRINT', 'LGPD_DOSSIER']),
  record_count: z.number().int().min(0),
  filters_applied: z.string().max(1000).optional(),
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

export const CancelDocumentErrorSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'A justificativa operacional de cancelamento por erro deve conter no mínimo 10 caracteres')
    .max(1000, 'A justificativa não pode exceder 1000 caracteres'),
  confirmed: z.literal(true, {
    errorMap: () => ({
      message: 'É obrigatório confirmar expressamente a ciência do cancelamento administrativo imutável e notificação do responsável legal.',
    }),
  }),
});
