// ============================================================================
// TIPOS E CONTRATOS DO SISTEMA SESI SAÚDE
// ============================================================================

export type DocumentStatus = 'draft' | 'pending' | 'signed' | 'revoked' | 'expired' | 'CANCELADO_POR_ERRO' | 'cancelled_error';

export type SignerRelationship = 
  | 'Pai' 
  | 'Mãe' 
  | 'Tutor Legal' 
  | 'Tutor(a) Legal'
  | 'Responsável por Guarda Judicial'
  | 'Guarda Judicial'
  | 'Avô/Avó'
  | 'Avô / Avó'
  | 'Tio/Tia'
  | 'Tio / Tia'
  | 'Outro'
  | 'Outro Responsável Legal'
  | 'Próprio Estudante (Maior de Idade)'; // CC/2002 Art. 5º — plena capacidade civil aos 18 anos

export type IdentityMethod = 'matricula_sesi' | 'declaracao_responsavel';

export type AdminRole = 'operador' | 'dpo' | 'admin_master';

export type LgpdRequestType = 'access' | 'rectification' | 'deletion' | 'revocation_appeal';

export type LgpdRequestStatus = 'pending' | 'in_analysis' | 'completed' | 'rejected';

export interface Institution {
  id: string; // slug único para URL (ex: 'cemeit')
  name: string; // nome oficial completo (ex: 'CEMEIT - Centro de Ensino Médio Escola Industrial de Taguatinga')
  short_name: string; // sigla / nome curto
  city: string;
  state: string;
  is_active: boolean;
  created_at?: string;
}

export interface DocumentTemplate {
  id: string;
  version: number;
  title: string;
  procedure_description: string;
  content_markdown: string;
  content_sha256: string;
  consent_text_version: number;
  retention_days: number;
  is_active: boolean;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  template_id: string;
  template_version: number;
  content_sha256: string;
  minor_name: string;
  minor_birth_date: string;
  parent_name?: string;
  parent_email_encrypted: string;
  parent_phone_encrypted?: string;
  key_version: number;
  access_token: string;
  status: DocumentStatus;
  otp_secret_hash?: string;
  otp_attempts: number;
  otp_expires_at?: string;
  otp_resend_count: number;
  signed_pdf_r2_key?: string;
  created_by_admin?: string;
  revoked_at?: string;
  revoked_reason?: string;
  cancelled_at?: string;
  cancelled_by_admin_id?: string;
  cancellation_reason?: string;
  cancellation_ip?: string;
  retention_expires_at: string;
  expires_at: string;
  created_at: string;
  // ── V3: Versionamento de Consentimento LGPD (migration_v3.sql) ─────────────
  terms_version?: string;        // Versão semântica do termo aceito (ex: "1.0")
  token_sent_at?: string | null; // Timestamp de envio do link por e-mail/WhatsApp
  token_ttl_days?: number;       // Prazo de validade do link em dias (padrão: 3)
}

export interface DocumentCancellationAudit {
  id: string;
  document_id: string;
  cancelled_at: string;
  ip_address: string;
  user_agent: string;
  cancelled_by_user_id: string;
  cancelled_by_user_email: string;
  cancelled_by_role: string;
  justification: string;
  document_manifest_sha256?: string;
  log_row_hash: string;
  created_at?: string;
}

export interface AuditLogRow {
  id: string;
  document_id: string;
  prev_log_hash: string | null;
  signed_at: string;
  signer_name: string;
  signer_cpf_encrypted: string;
  signer_cpf_masked: string;
  signer_relationship: SignerRelationship;
  guardianship_doc_r2_key?: string | null;
  identity_method: IdentityMethod;
  signature_png_encrypted: string;
  signature_png_sha256: string;
  key_version: number;
  ip_address: string;
  user_agent: string;
  geo_city?: string | null;
  geo_region?: string | null;
  geo_country?: string | null;
  client_fingerprint?: string | null;
  content_sha256_at_signing: string;
  consent_text_version: number;
  manifest_sha256: string;
  otp_requested_at?: string | null;
  otp_verified_at?: string | null;
  otp_email_message_id?: string | null;
  doc_parent_hash_sha256?: string | null;
  device_metadata?: string | null;
  log_row_hash: string;
  created_at: string;
}

export interface AuditLogRowInput {
  id: string;
  document_id: string;
  prev_log_hash: string | null;
  signed_at: string;
  signer_name: string;
  signer_cpf_masked: string;
  signer_relationship: string;
  identity_method: string;
  signature_png_sha256: string;
  ip_address: string;
  user_agent: string;
  client_fingerprint?: string | null;
  content_sha256_at_signing: string;
  consent_text_version: number;
  manifest_sha256: string;
  otp_requested_at?: string | null;
  otp_verified_at?: string | null;
  otp_email_message_id?: string | null;
  doc_parent_hash_sha256?: string | null;
  device_metadata?: string | null;
}

export interface LgpdRequestRecord {
  id: string;
  requester_name: string;
  requester_cpf_masked: string;
  requester_email_encrypted: string;
  request_type: LgpdRequestType;
  details: string;
  status: LgpdRequestStatus;
  response_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface AdminAuditLogRecord {
  id: string;
  event_type: string;
  actor_user_id: string;
  actor_user_email: string;
  actor_user_role: string;
  ip_address: string;
  user_agent: string;
  target_resource: string;
  action_details: string;
  log_row_hash: string;
  created_at: string;
}

export interface ApplicationAccessLogRecord {
  id: string;
  ip_address: string;
  user_agent: string;
  endpoint_path: string;
  http_method: string;
  status_code: number;
  session_token_hash?: string | null;
  retention_until: string;
  created_at: string;
}

export interface SpecialtiesConsent {
  oftalmologia: boolean;
  audiometria: boolean;
  odontologia: boolean;
  psicologia: boolean;
  nutricao: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export interface PublicValidationResponse {
  valid: boolean;
  validation_code?: string;
  legal_notice: string;
  signature_type: string;
  document_id: string;
  manifest_sha256: string;
  content_sha256: string;
  signature_png_sha256: string;
  signed_at_utc: string;
  signer_name: string;
  signer_cpf_masked: string;
  signer_relationship: string;
  ip_address: string;
  geolocation: string;
  user_agent: string;
  identity_method: IdentityMethod;
  procedure_title: string;
  procedure_description: string;
  minor_name_initials: string;
  minor_series?: string | null;
  minor_class?: string | null;
  minor_turn?: string | null;
  document_status: DocumentStatus;
  chain_position: number;
  prev_log_hash: string | null;
  tsa_verified?: boolean;
  tsa_authority?: string;
  auth_image?: 'yes' | 'no' | boolean | null;
  auth_health?: 'yes' | 'no' | boolean | null;
  auth_data?: 'yes' | 'no' | boolean | null;
  revocation_info?: {
    revoked_at: string;
    revoked_reason: string;
  } | null;
  cancellation_info?: {
    cancelled_at: string;
    cancellation_reason: string;
    cancelled_by_role?: string;
  } | null;
}

export interface DuplicateStudentCheckResponse {
  hasExistingSignature: boolean;
  existingValidationCode?: string;
  signedAt?: string;
  signerNameMasked?: string;
  minorName?: string;
  documentId?: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalBlocks: number;
  corruptedBlockIndex?: number;
  corruptedBlockId?: string;
  error?: string;
  merkleRoot: string;
}

// ============================================================================
// CRIPTOGRAFIA DE DADOS (LGPD Art. 46)
// ============================================================================

/**
 * Versão de Chave de Criptografia AES-256 (Key Rotation - Privacy by Design)
 * Conformidade: LGPD Art. 46 (medidas de segurança técnicas)
 */
export interface EncryptionKeyVersion {
  version: number;
  key_sha256_fingerprint: string; // Fingerprint da chave (NUNCA a chave em si)
  algorithm: string;              // 'AES-GCM-256'
  status: 'active' | 'retired' | 'compromised';
  activated_at: string;
  retired_at?: string | null;
  created_by: string;
  notes?: string | null;
}

export interface Env {
  DB: D1Database;
  BUCKET_DOCS: R2Bucket;
  KV_RATE_LIMIT: KVNamespace;
  APP_ENV?: string;
  DEFAULT_KEY_VERSION?: string;
  SESI_INSTITUTION_NAME?: string;
  LEGAL_FRAMEWORK_NOTICE?: string;
  ENCRYPTION_KEY_V1?: string;
  OTP_PEPPER?: string;
  JWT_ADMIN_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_HOSTNAMES?: string;
  TSA_ENDPOINT?: string;
  RESEND_API_KEY?: string;        // Chave API Resend para e-mails transacionais
  EMAIL_FROM?: string;            // Endereço de envio (ex: 'SESI Saúde <autorizacoes@catraki.com.br>')
}
