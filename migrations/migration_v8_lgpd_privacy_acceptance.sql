-- ============================================================================
-- MIGRAÇÃO V8: Conformidade LGPD — Aceite da Política de Privacidade (Versão/Data/Hora),
-- Blind Index de CPF do Signatário e Prazos de Atendimento (15 dias)
-- ============================================================================

-- 1. Colunas de rastreabilidade do aceite da Política de Privacidade e Blind Index do CPF do signatário
ALTER TABLE documents ADD COLUMN privacy_policy_version TEXT DEFAULT '1.1.2026';
ALTER TABLE documents ADD COLUMN privacy_policy_accepted_at DATETIME;
ALTER TABLE documents ADD COLUMN signer_cpf_bindex_sha256 TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_signer_cpf_bindex
  ON documents(signer_cpf_bindex_sha256);

-- 2. Colunas de busca sigilosa, aceite da política e prazo legal (15 dias) em lgpd_requests
ALTER TABLE lgpd_requests ADD COLUMN requester_cpf_bindex_sha256 TEXT;
ALTER TABLE lgpd_requests ADD COLUMN requester_email_bindex_sha256 TEXT;
ALTER TABLE lgpd_requests ADD COLUMN privacy_policy_version TEXT DEFAULT '1.1.2026';
ALTER TABLE lgpd_requests ADD COLUMN privacy_policy_accepted_at DATETIME;
ALTER TABLE lgpd_requests ADD COLUMN response_deadline_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_cpf_bindex
  ON lgpd_requests(requester_cpf_bindex_sha256);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_email_bindex
  ON lgpd_requests(requester_email_bindex_sha256);
