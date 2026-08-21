-- ============================================================================
-- SCHEMA D1 (SQLite) — SISTEMA DE ASSINATURA ELETRÔNICA SESI SAÚDE
-- Conformidade: MP 2.200-2/2001, Decreto 10.543/2020, LGPD (Lei 13.709/2018)
-- ============================================================================

-- 0. Instituições / Escolas Participantes do Projeto (Roteamento Dinâmico por URL)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY, -- Slug na URL (ex: 'cemeit')
  name TEXT NOT NULL,  -- Nome Oficial da Escola
  short_name TEXT NOT NULL, -- Sigla / Nome Curto
  city TEXT NOT NULL DEFAULT 'Taguatinga',
  state TEXT NOT NULL DEFAULT 'DF',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1. Templates de Termo de Procedimento Médico (Imutáveis e Versionados)
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  procedure_description TEXT NOT NULL, -- Descrição médica específica obrigatória (LGPD Art. 11/14)
  content_markdown TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  consent_text_version INTEGER NOT NULL DEFAULT 1,
  retention_days INTEGER NOT NULL DEFAULT 1825, -- Padrão 5 anos (alinhado a prontuário)
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, version)
);

-- 2. Documentos / Termos de Autorização Emitidos
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  minor_name TEXT NOT NULL,
  minor_birth_date TEXT NOT NULL,
  parent_name TEXT,
  parent_email_encrypted TEXT NOT NULL,
  parent_phone_encrypted TEXT,
  key_version INTEGER NOT NULL DEFAULT 1,
  access_token TEXT UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('draft','pending','signed','revoked','expired')) DEFAULT 'pending',
  otp_secret_hash TEXT,
  otp_attempts INTEGER DEFAULT 0,
  otp_expires_at DATETIME,
  otp_resend_count INTEGER DEFAULT 0,
  signed_pdf_r2_key TEXT,
  created_by_admin TEXT,
  revoked_at DATETIME,
  revoked_reason TEXT,
  retention_expires_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id, template_version) REFERENCES document_templates(id, version)
);

-- 3. Trilha de Auditoria Criptográfica com Hash Chain (Imutável / Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  prev_log_hash TEXT,
  signed_at DATETIME NOT NULL,
  signer_name TEXT NOT NULL,
  signer_cpf_encrypted TEXT NOT NULL,
  signer_cpf_masked TEXT NOT NULL,
  signer_relationship TEXT NOT NULL,
  guardianship_doc_r2_key TEXT,
  identity_method TEXT CHECK(identity_method IN ('matricula_sesi','manual_review')) NOT NULL,
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
  consent_text_version INTEGER NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  tsa_timestamp_token TEXT,
  log_row_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Triggers de Bloqueio Físico contra Atualização ou Deleção Retroativa no audit_logs
CREATE TRIGGER IF NOT EXISTS prevent_audit_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'CRITICAL SECURITY VIOLATION: audit_logs is append-only and cryptographically immutable.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'CRITICAL SECURITY VIOLATION: audit_logs is append-only and cannot be deleted.');
END;

-- 5. Fila de Revisão Manual de Vínculo de Responsável
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  signer_name TEXT NOT NULL,
  signer_cpf_masked TEXT NOT NULL,
  signer_cpf_encrypted TEXT NOT NULL,
  signer_relationship TEXT NOT NULL,
  identity_doc_r2_key TEXT NOT NULL,
  selfie_doc_r2_key TEXT NOT NULL,
  guardianship_doc_r2_key TEXT,
  status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by TEXT,
  review_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Usuários Administrativos com RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('operador','dpo','admin_master')) NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Log de Auditoria Administrativa Separado
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  target_id TEXT,
  ip_address TEXT,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Solicitações de Direitos dos Titulares (LGPD Art. 18)
CREATE TABLE IF NOT EXISTS lgpd_requests (
  id TEXT PRIMARY KEY,
  requester_name TEXT NOT NULL,
  requester_cpf_masked TEXT NOT NULL,
  requester_email_encrypted TEXT NOT NULL,
  request_type TEXT CHECK(request_type IN ('access','rectification','deletion','revocation_appeal')) NOT NULL,
  details TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','in_analysis','completed','rejected')) DEFAULT 'pending',
  response_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- 9. Ancoragem Periódica da Raiz de Merkle
CREATE TABLE IF NOT EXISTS merkle_roots_anchors (
  id TEXT PRIMARY KEY,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  row_count INTEGER NOT NULL,
  merkle_root_sha256 TEXT NOT NULL,
  anchor_target TEXT NOT NULL,
  anchor_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Otimização e Segurança
CREATE INDEX IF NOT EXISTS idx_docs_token ON documents(access_token);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_docs_retention ON documents(retention_expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_doc ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_cpf_masked ON audit_logs(signer_cpf_masked);
CREATE INDEX IF NOT EXISTS idx_audit_manifest ON audit_logs(manifest_sha256);
CREATE INDEX IF NOT EXISTS idx_manual_rev_doc ON manual_review_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_manual_rev_status ON manual_review_queue(status);

-- ============================================================================
-- DADOS INICIAIS (SEED DATA) — PROJETO ESCOLA CIDADÃ
-- ============================================================================

-- 1. Template Oficial do Termo
INSERT OR IGNORE INTO document_templates (
  id, version, title, procedure_description, content_markdown, content_sha256, consent_text_version, retention_days, is_active
) VALUES (
  'proc_escola_cidada',
  1,
  'Projeto Escola Cidadã: Saúde em Movimento',
  'Autorização para atendimento do aluno nas ações do projeto Escola Cidadã: Saúde em Movimento (UnB + SESI-DF + Finatec), sem a presença do responsável legal, com consentimento granular para tratamento de dados pessoais (LGPD) e uso de imagem, nome e voz (ECA/Art. 17).',
  '## TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO DIGITAL (TCLE)',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  1,
  1095,
  1
);

-- 2. Documento de Acesso Inicial
INSERT OR IGNORE INTO documents (
  id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name,
  parent_email_encrypted, parent_phone_encrypted, key_version, access_token, status,
  retention_expires_at, expires_at
) VALUES (
  'DOC-2026-000001',
  'proc_escola_cidada',
  1,
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'Estudante Escola Cidadã',
  '2010-01-01',
  'Responsável Legal',
  'ENC_SEED',
  'ENC_SEED',
  1,
  'projeto-escola-cidada-2026',
  'pending',
  datetime('now', '+3 years'),
  datetime('now', '+1 year')
);

INSERT OR IGNORE INTO documents (
  id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name,
  parent_email_encrypted, parent_phone_encrypted, key_version, access_token, status,
  retention_expires_at, expires_at
) VALUES (
  'DOC-2026-000002',
  'proc_escola_cidada',
  1,
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'Estudante Escola Cidadã',
  '2010-01-01',
  'Responsável Legal',
  'ENC_SEED',
  'ENC_SEED',
  1,
  'demo-token-sesi-audiometria-2026',
  'pending',
  datetime('now', '+3 years'),
  datetime('now', '+1 year')
);

-- 3. Usuário Administrador Padrão
INSERT OR IGNORE INTO admin_users (
  id, name, email, password_hash, role, is_active
) VALUES (
  'USR-ADMIN-001',
  'Administrador SESI DF',
  'admin@sesi.org.br',
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
  'admin_master',
  1
);

-- 4. Escolas / Instituições Cadastradas (Rotas Dinâmicas)
INSERT OR IGNORE INTO institutions (id, name, short_name, city, state, is_active) VALUES
('cemeit', 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)', 'CEMEIT', 'Taguatinga', 'DF', 1),
('ced01-estrutural', 'Centro Educacional 01 da Estrutural', 'CED 01 Estrutural', 'Estrutural', 'DF', 1),
('cem02-ceilandia', 'Centro de Ensino Médio 02 de Ceilândia', 'CEM 02 Ceilândia', 'Ceilândia', 'DF', 1),
('ced02-guara', 'Centro Educacional 02 do Guará', 'CED 02 Guará', 'Guará', 'DF', 1);
