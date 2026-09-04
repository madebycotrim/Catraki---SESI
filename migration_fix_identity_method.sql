-- ============================================================================
-- MIGRAÇÃO D1: Remoção do CHECK constraint restritivo em identity_method
-- Mapeamento explícito de colunas para garantir 100% de integridade e compatibilidade
-- ============================================================================

PRAGMA foreign_keys=OFF;

-- 1. Remove triggers de proteção antigos para permitir a atualização da tabela
DROP TRIGGER IF EXISTS prevent_audit_update;
DROP TRIGGER IF EXISTS prevent_audit_delete;

-- 2. Cria tabela temporária sem a restrição legada
CREATE TABLE IF NOT EXISTS audit_logs_new (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  prev_log_hash TEXT,
  signed_at DATETIME NOT NULL,
  signer_name TEXT NOT NULL,
  signer_cpf_encrypted TEXT NOT NULL,
  signer_cpf_masked TEXT NOT NULL,
  signer_relationship TEXT NOT NULL,
  guardianship_doc_r2_key TEXT,
  identity_method TEXT NOT NULL DEFAULT 'declaracao_responsavel',
  signature_png_encrypted TEXT NOT NULL,
  signature_png_sha256 TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  geo_city TEXT,
  geo_region TEXT,
  geo_country TEXT,
  client_fingerprint TEXT,
  content_sha256_at_signing TEXT NOT NULL,
  consent_text_version INTEGER NOT NULL DEFAULT 1,
  manifest_sha256 TEXT NOT NULL,
  otp_requested_at DATETIME,
  otp_verified_at DATETIME,
  otp_email_message_id TEXT,
  doc_parent_hash_sha256 TEXT,
  device_metadata TEXT,
  log_row_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transfere todos os dados mapeando cada coluna explicitamente pelo nome
INSERT INTO audit_logs_new (
  id,
  document_id,
  prev_log_hash,
  signed_at,
  signer_name,
  signer_cpf_encrypted,
  signer_cpf_masked,
  signer_relationship,
  guardianship_doc_r2_key,
  identity_method,
  signature_png_encrypted,
  signature_png_sha256,
  key_version,
  ip_address,
  user_agent,
  geo_city,
  geo_region,
  geo_country,
  client_fingerprint,
  content_sha256_at_signing,
  consent_text_version,
  manifest_sha256,
  log_row_hash,
  created_at
)
SELECT
  id,
  document_id,
  prev_log_hash,
  signed_at,
  signer_name,
  signer_cpf_encrypted,
  signer_cpf_masked,
  signer_relationship,
  guardianship_doc_r2_key,
  identity_method,
  signature_png_encrypted,
  signature_png_sha256,
  key_version,
  ip_address,
  user_agent,
  geo_city,
  geo_region,
  geo_country,
  client_fingerprint,
  content_sha256_at_signing,
  consent_text_version,
  manifest_sha256,
  log_row_hash,
  created_at
FROM audit_logs;

-- 4. Substitui a tabela
DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

-- 5. Recria os índices de performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_row_hash ON audit_logs(log_row_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_manifest_sha256 ON audit_logs(manifest_sha256);

PRAGMA foreign_keys=ON;
