/**
 * Constantes e Inventário Oficial de Conformidade LGPD (Lei nº 13.709/2018)
 * Fonte única de verdade para versão da Política de Privacidade,
 * finalidade de coleta por tela e suboperadores externos.
 */

export const PRIVACY_POLICY_VERSION = '1.1.2026';
export const PRIVACY_POLICY_UPDATED_AT = '16 de novembro de 2026';
export const LGPD_RESPONSE_DEADLINE_DAYS = 15; // Art. 19, II da LGPD

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
