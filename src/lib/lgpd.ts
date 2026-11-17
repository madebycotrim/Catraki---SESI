/**
 * Constantes e Inventário Oficial de Conformidade LGPD (Lei nº 13.709/2018)
 * Fonte única de verdade para versão da Política de Privacidade,
 * finalidade de coleta por tela e suboperadores externos.
 */

export const PRIVACY_POLICY_VERSION = '1.1.2026';
export const PRIVACY_POLICY_UPDATED_AT = '16 de novembro de 2026';
export const LGPD_RESPONSE_DEADLINE_DAYS = 15; // Art. 19, II da LGPD

export interface ScreenDataCollectionEntry {
  route: string;
  screenName: string;
  personalDataCollected: string[];
  purpose: string;
  legalBasis: string;
  privacyAcceptanceRecorded: boolean;
}

export const DATA_COLLECTION_SCREENS: ScreenDataCollectionEntry[] = [
  {
    route: '/autorizar/:escola (Etapa 2 — Dados Cadastrais)',
    screenName: 'Formulário de Identificação do Responsável e Estudante',
    personalDataCollected: [
      'Responsável: Nome completo, CPF, vínculo legal, telefone/WhatsApp e e-mail',
      'Estudante: Nome completo, data de nascimento, CPF, série/ano, turma e turno',
    ],
    purpose:
      'Identificar o responsável legal e o estudante na escola participante, evitar autorizações duplicadas, enviar o código de verificação em duas etapas (OTP) por e-mail e entregar o comprovante PDF assinado.',
    legalBasis: 'Art. 7º, I; Art. 11, I; Art. 14, § 1º da LGPD (Consentimento específico e proteção de crianças e adolescentes)',
    privacyAcceptanceRecorded: true,
  },
  {
    route: '/autorizar/:escola (Etapa 3 — Consentimento, OTP e Assinatura)',
    screenName: 'Tela de Aceite Granular, Código OTP e Assinatura Eletrônica',
    personalDataCollected: [
      'Código OTP de 6 dígitos enviado por e-mail',
      'Assinatura manuscrita em canvas (imagem PNG criptografada)',
      'Opções de consentimento (saúde, dados cadastrais e uso de imagem)',
      'Evidências digitais do dispositivo (IP, User-Agent, resolução, fuso horário e geolocalização aproximada via Cloudflare Edge)',
      'Registro de aceite da Política de Privacidade (versão, data e hora UTC)',
    ],
    purpose:
      'Comprovar a autoria, integridade e manifestação inequívoca de vontade na assinatura eletrônica simples, garantindo validade jurídica e prevenção a fraudes.',
    legalBasis: 'MP 2.200-2/2001 Art. 10, § 2º; Lei 14.063/2020; LGPD Art. 7º, I e II; Marco Civil Art. 15',
    privacyAcceptanceRecorded: true,
  },
  {
    route: '/revogar',
    screenName: 'Portal de Revogação de Autorização',
    personalDataCollected: [
      'Protocolo/Token do documento',
      'CPF do responsável signatário',
      'Motivo da revogação',
      'IP, User-Agent e registro de aceite da Política de Privacidade (versão, data e hora)',
    ],
    purpose:
      'Validar a legitimidade do responsável signatário para revogar o consentimento previamente concedido e suspender novos atendimentos do estudante.',
    legalBasis: 'Art. 8º, § 5º e Art. 18, VIII da LGPD (Direito de revogação do consentimento)',
    privacyAcceptanceRecorded: true,
  },
  {
    route: '/titular',
    screenName: 'Portal de Direitos do Titular (LGPD Art. 18)',
    personalDataCollected: [
      'Nome completo do solicitante',
      'CPF',
      'E-mail de contato',
      'Tipo de solicitação (Acesso/Exportação, Retificação, Eliminação/Anonimização ou Recurso de Revogação) e detalhes',
      'Registro de aceite da Política de Privacidade (versão, data e hora)',
    ],
    purpose:
      'Receber, autenticar e responder pedidos de acesso, portabilidade, retificação ou eliminação/anonimização de dados pessoais dentro do prazo legal de até 15 dias.',
    legalBasis: 'Art. 18 e Art. 19, II da LGPD (Atendimento a direitos do titular)',
    privacyAcceptanceRecorded: true,
  },
  {
    route: '/validar/:codigo',
    screenName: 'Validador Público de Autenticidade',
    personalDataCollected: [
      'Não coleta dados cadastrais pessoais; recebe apenas o código de validação ou hash SHA-256 para consulta pública e exibe dados minimizados/mascarados (iniciais do estudante e CPF mascarado).',
    ],
    purpose:
      'Permitir a conferência pública da autenticidade e integridade criptográfica do comprovante de autorização.',
    legalBasis: 'Lei 14.063/2020; LGPD Art. 6º, III (Princípio da necessidade e minimização)',
    privacyAcceptanceRecorded: false,
  },
  {
    route: '/admin (Login Corporativo Microsoft)',
    screenName: 'Autenticação Administrativa (Microsoft Entra ID)',
    personalDataCollected: [
      'Nome completo e e-mail institucional (@sistemafibra.org.br / domínios homologados)',
      'Perfil de acesso (RBAC), IP e User-Agent na trilha de auditoria',
    ],
    purpose:
      'Autenticar operadores autorizados e o Encarregado de Dados (DPO) com controle de acesso baseado em papéis e trilha de auditoria de segurança.',
    legalBasis: 'Art. 7º, II e IX da LGPD; Art. 15 do Marco Civil da Internet (Lei 12.965/2014)',
    privacyAcceptanceRecorded: false,
  },
];

export interface ExternalSubprocessorEntry {
  serviceName: string;
  provider: string;
  category: string;
  dataReceived: string;
  country: string;
  outsideBrazil: boolean;
  legalMechanism: string;
}

export const EXTERNAL_SUBPROCESSORS: ExternalSubprocessorEntry[] = [
  {
    serviceName: 'Cloudflare Pages, Workers, D1, KV e R2',
    provider: 'Cloudflare, Inc.',
    category: 'Hospedagem, Banco de Dados, Cache e Armazenamento de Objetos',
    dataReceived:
      'Endereço IP, User-Agent, geolocalização aproximada (cidade/estado/país), dados cadastrais criptografados/mascarados em D1, tokens temporários em KV e PDFs assinados/manifestos em R2.',
    country: 'Estados Unidos / Rede Global Edge',
    outsideBrazil: true,
    legalMechanism: 'Cláusulas contratuais padrão (DPA Cloudflare) e criptografia AES-GCM-256 em repouso (Art. 33, II, b da LGPD)',
  },
  {
    serviceName: 'Cloudflare Turnstile',
    provider: 'Cloudflare, Inc.',
    category: 'Proteção Anti-Bot / Segurança',
    dataReceived: 'Token de desafio anti-bot, endereço IP do solicitante e sinais de navegador.',
    country: 'Estados Unidos / Rede Global Edge',
    outsideBrazil: true,
    legalMechanism: 'DPA Cloudflare e necessidade técnica de segurança (Art. 33 e Art. 7º, IX da LGPD)',
  },
  {
    serviceName: 'Resend API (api.resend.com)',
    provider: 'Resend, Inc.',
    category: 'Envio de E-mails Transacionais (Provedor Principal)',
    dataReceived:
      'E-mail do responsável, nome do responsável, nome do estudante, escola, código OTP de 6 dígitos e PDF do termo assinado em anexo.',
    country: 'Estados Unidos (AWS us-east-1)',
    outsideBrazil: true,
    legalMechanism: 'DPA Resend e execução de procedimento solicitado pelo titular (Art. 33 da LGPD)',
  },
  {
    serviceName: 'MailChannels API (api.mailchannels.net)',
    provider: 'MailChannels Corp.',
    category: 'Envio de E-mails Transacionais (Fallback)',
    dataReceived:
      'Apenas em caso de indisponibilidade do Resend: e-mail do responsável, nome do responsável, nome do estudante e conteúdo do e-mail transacional (OTP/notificação).',
    country: 'Estados Unidos / Canadá',
    outsideBrazil: true,
    legalMechanism: 'Contingência operacional sob cláusulas de proteção de dados (Art. 33 da LGPD)',
  },
  {
    serviceName: 'Microsoft Entra ID / Microsoft Graph',
    provider: 'Microsoft Corporation',
    category: 'Autenticação Corporativa OAuth 2.0 PKCE (Somente Administradores/DPO)',
    dataReceived:
      'Credenciais corporativas de gestores (@sistemafibra.org.br e domínios homologados) para emissão de token de sessão e leitura do perfil (/v1.0/me: nome e e-mail institucional). Não recebe dados de alunos ou famílias.',
    country: 'Estados Unidos / Global (Tenant Corporativo)',
    outsideBrazil: true,
    legalMechanism: 'Contrato corporativo Microsoft Online Services DPA (Art. 33 da LGPD)',
  },
];
