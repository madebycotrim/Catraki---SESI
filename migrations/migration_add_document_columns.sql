-- ============================================================================
-- MIGRAÇÃO D1: Adição das colunas de autorizações e dados adicionais em documents
-- ============================================================================

ALTER TABLE documents ADD COLUMN auth_image TEXT;
ALTER TABLE documents ADD COLUMN auth_health TEXT;
ALTER TABLE documents ADD COLUMN auth_data TEXT;
ALTER TABLE documents ADD COLUMN minor_cpf TEXT;
ALTER TABLE documents ADD COLUMN minor_cpf_encrypted TEXT;
ALTER TABLE documents ADD COLUMN minor_cpf_bindex_sha256 TEXT;
ALTER TABLE documents ADD COLUMN minor_series TEXT;
ALTER TABLE documents ADD COLUMN minor_class TEXT;
ALTER TABLE documents ADD COLUMN minor_turn TEXT;
ALTER TABLE documents ADD COLUMN parent_email_bindex_sha256 TEXT;
ALTER TABLE documents ADD COLUMN doc_parent_hash_sha256 TEXT;
ALTER TABLE documents ADD COLUMN otp_requested_at DATETIME;
ALTER TABLE documents ADD COLUMN otp_verified_at DATETIME;
ALTER TABLE documents ADD COLUMN otp_email_message_id TEXT;
ALTER TABLE documents ADD COLUMN otp_delivery_status TEXT;
ALTER TABLE documents ADD COLUMN terms_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN token_sent_at DATETIME;
ALTER TABLE documents ADD COLUMN token_ttl_days INTEGER NOT NULL DEFAULT 3;
