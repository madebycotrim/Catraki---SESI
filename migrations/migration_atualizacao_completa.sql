-- ============================================================================
-- MIGRAÇÃO CONSOLIDADA E ATUALIZAÇÃO DO BANCO DE DADOS (CATRAKI / SESI)
-- Adiciona todas as colunas e tabelas necessárias para quem já possui um banco existente.
--
-- Como executar LOCALMENTE:
--   npx wrangler d1 execute catraki_db --local --file=migration_atualizacao_completa.sql
--
-- Como executar em PRODUÇÃO (Cloudflare):
--   npx wrangler d1 execute catraki_db --remote --file=migration_atualizacao_completa.sql
-- ============================================================================

-- 1. Colunas de Autorizações Específicas na tabela documents
ALTER TABLE documents ADD COLUMN auth_image TEXT;
ALTER TABLE documents ADD COLUMN auth_health TEXT;
ALTER TABLE documents ADD COLUMN auth_data TEXT;

-- 2. Colunas de Versionamento e Expiração (TTL) na tabela documents
ALTER TABLE documents ADD COLUMN terms_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN token_sent_at DATETIME;
ALTER TABLE documents ADD COLUMN token_ttl_days INTEGER NOT NULL DEFAULT 3;

-- 3. Tabela de Gestão de Chaves Criptográficas (caso ainda não exista)
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

-- 4. Índices para Otimização de Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_docs_token_sent ON documents(token_sent_at);
CREATE INDEX IF NOT EXISTS idx_docs_terms_version ON documents(terms_version);
CREATE INDEX IF NOT EXISTS idx_docs_minor_cpf_bindex ON documents(minor_cpf_bindex_sha256);
CREATE INDEX IF NOT EXISTS idx_docs_integrity_alert ON documents(integrity_alert_at);
CREATE INDEX IF NOT EXISTS idx_admin_last_login ON admin_users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_enc_key_status ON encryption_key_versions(status);
