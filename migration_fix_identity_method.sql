-- ============================================================================
-- MIGRAÇÃO D1: Remoção do CHECK constraint restritivo em identity_method
-- Permite métodos de declaração de responsabilidade e titular ('declaracao_responsavel', 'declaracao_titular')
-- ============================================================================

PRAGMA foreign_keys=OFF;

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
  signature_png_sha256 TEXT NOT NULL CHECK(LENGTH(signature_png_sha256) = 64),
  key_version INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  geo_city TEXT,
  geo_region TEXT,
  geo_country TEXT,
  client_fingerprint TEXT,
  content_sha256_at_signing TEXT NOT NULL CHECK(LENGTH(content_sha256_at_signing) = 64),
  consent_text_version INTEGER NOT NULL DEFAULT 1,
  manifest_sha256 TEXT NOT NULL CHECK(LENGTH(manifest_sha256) = 64),
  otp_requested_at DATETIME,
  otp_verified_at DATETIME,
  otp_email_message_id TEXT,
  doc_parent_hash_sha256 TEXT,
  device_metadata TEXT,
  log_row_hash TEXT NOT NULL CHECK(LENGTH(log_row_hash) = 64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_logs_new SELECT * FROM audit_logs;

DROP TABLE audit_logs;

ALTER TABLE audit_logs_new RENAME TO audit_logs;

CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_row_hash ON audit_logs(log_row_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_manifest_sha256 ON audit_logs(manifest_sha256);

PRAGMA foreign_keys=ON;
