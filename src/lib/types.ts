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
  | 'Outro Responsável Legal';

export type IdentityMethod = 'matricula_sesi' | 'manual_review';

export type AdminRole = 'operador' | 'dpo' | 'admin_master';

export type ManualReviewStatus = 'pending' | 'approved' | 'rejected';

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
  tsa_timestamp_token?: string | null;
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
  tsa_timestamp_token?: string | null;
  otp_requested_at?: string | null;
  otp_verified_at?: string | null;
  otp_email_message_id?: string | null;
  doc_parent_hash_sha256?: string | null;
  device_metadata?: string | null;
}

export interface ManualReviewRecord {
  id: string;
  document_id: string;
  signer_name: string;
  signer_cpf_masked: string;
  signer_cpf_encrypted: string;
  signer_relationship: SignerRelationship;
  identity_doc_r2_key: string;
  selfie_doc_r2_key: string;
  guardianship_doc_r2_key?: string | null;
  status: ManualReviewStatus;
  reviewed_by?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
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
  tsa_verified: boolean;
  tsa_authority?: string;
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
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_PHONE?: string;
  TWILIO_WHATSAPP_FROM?: string;
}
