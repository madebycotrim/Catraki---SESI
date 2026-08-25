-- ============================================================================
-- MIGRAÇÃO DE SCHEMA E SEEDS DE CONFORMIDADE LEGAL (LGPD / MARCO CIVIL / LEI 14.063/2020)
-- Totalmente idempotente — Executa tabelas e seeds primeiro.
--
-- Comando para rodar LOCALMENTE (wrangler dev / local D1):
--   npx wrangler d1 execute catraki_db --local --file=migration_v2.sql
--
-- Comando para rodar em PRODUÇÃO (Cloudflare D1 remoto):
--   npx wrangler d1 execute catraki_db --remote --file=migration_v2.sql
-- ============================================================================

-- 1. Carga de Dados Inicial (Seeds Idempotentes — INSERT OR IGNORE)
INSERT OR IGNORE INTO institutions (id, name, short_name, city, state, is_active) VALUES
('cemeit', 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)', 'CEMEIT', 'Taguatinga', 'DF', 1);

INSERT OR IGNORE INTO admin_users (
  id, name, email, password_hash, role, is_active
) VALUES (
  'USR-ADMIN-MASTER',
  'Mateus Cotrim',
  'mateus.cotrim@sistemafibra.org.br',
  'MICROSOFT_ENTRA_ID_SSO',
  'admin_master',
  1
);

-- 2. Novas Tabelas de Conformidade e Prontidão (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS encryption_key_versions (
  version INTEGER PRIMARY KEY,
  key_sha256_fingerprint TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
  status TEXT CHECK(status IN ('active','retired','compromised')) NOT NULL DEFAULT 'active',
  activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at DATETIME,
  created_by TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS icp_brasil_certificates (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  serial_number TEXT NOT NULL,
  subject_dn TEXT NOT NULL,
  issuer_cn TEXT NOT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  certificate_pem_sha256 TEXT NOT NULL CHECK(LENGTH(certificate_pem_sha256) = 64),
  signature_level TEXT CHECK(signature_level IN ('advanced','qualified')) NOT NULL,
  ocsp_status TEXT CHECK(ocsp_status IN ('good','revoked','unknown')) DEFAULT 'unknown',
  ocsp_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfa_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  method TEXT CHECK(method IN ('otp_email','otp_sms','icp_brasil','totp')) NOT NULL,
  device_fingerprint TEXT,
  verified_at DATETIME,
  expires_at DATETIME NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO encryption_key_versions (version, key_sha256_fingerprint, algorithm, status, activated_at, created_by, notes)
VALUES (1, 'v1-fingerprint-configurar-via-env-ENCRYPTION_KEY_V1', 'AES-GCM-256', 'active', datetime('now'), 'USR-ADMIN-MASTER', 'Chave mestra inicial — fingerprint deve ser atualizado com o SHA-256 da chave real configurada em ENCRYPTION_KEY_V1');

-- 3. Novos Índices Idempotentes (CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_admin_last_login ON admin_users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_enc_key_status ON encryption_key_versions(status);
CREATE INDEX IF NOT EXISTS idx_icp_doc ON icp_brasil_certificates(document_id);
CREATE INDEX IF NOT EXISTS idx_icp_valid ON icp_brasil_certificates(valid_until);
CREATE INDEX IF NOT EXISTS idx_mfa_session_doc ON mfa_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_mfa_expires ON mfa_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_docs_minor_cpf_bindex ON documents(minor_cpf_bindex_sha256);
CREATE INDEX IF NOT EXISTS idx_docs_integrity_alert ON documents(integrity_alert_at);


