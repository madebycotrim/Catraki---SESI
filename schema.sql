-- ============================================================================
-- SCHEMA D1 (SQLite) — PLATAFORMA CATRAKI / SESI SAÚDE
-- Sistema de Assinatura Eletrônica, Roteamento Escolar e Auditoria Criptográfica
-- Conformidade: MP 2.200-2/2001, Lei 14.063/2020 e LGPD (Lei 13.709/2018)
-- ============================================================================

-- 1. Instituições de Ensino / Escolas Participantes (Roteamento Dinâmico por URL)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,                       -- Slug na URL (ex: 'cemeit')
  name TEXT NOT NULL,                        -- Nome Oficial da Escola
  short_name TEXT NOT NULL,                  -- Sigla / Nome Curto
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Templates de Termos Médicos e Autorizações (Imutáveis e Versionados)
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version >= 1),
  title TEXT NOT NULL,
  procedure_description TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK(LENGTH(content_sha256) = 64),
  consent_text_version INTEGER NOT NULL DEFAULT 1,
  retention_days INTEGER NOT NULL DEFAULT 1095, -- 3 anos (LGPD Art. 14 / Prontuário Clínico)
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, version)
);

-- 3. Documentos e Termos de Consentimento Emitidos
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL DEFAULT 'proc_escola_cidada',
  template_version INTEGER NOT NULL DEFAULT 1,
  content_sha256 TEXT NOT NULL CHECK(LENGTH(content_sha256) = 64),
  minor_name TEXT NOT NULL,
  minor_birth_date TEXT NOT NULL,
  minor_cpf TEXT,
  parent_name TEXT,
  parent_email_encrypted TEXT,
  parent_phone_encrypted TEXT,
  parent_email_bindex_sha256 TEXT, -- Blind index SHA-256 para buscas seguras e sigilosas (LGPD)
  key_version INTEGER NOT NULL DEFAULT 1,
  access_token TEXT UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('draft','pending','signed','revoked','expired')) DEFAULT 'pending',
  otp_secret_hash TEXT,
  otp_attempts INTEGER DEFAULT 0 CHECK(otp_attempts >= 0 AND otp_attempts <= 5),
  otp_expires_at DATETIME,
  otp_resend_count INTEGER DEFAULT 0 CHECK(otp_resend_count >= 0 AND otp_resend_count <= 10),
  signed_pdf_r2_key TEXT,
  created_by_admin TEXT,
  revoked_at DATETIME,
  revoked_reason TEXT,
  retention_expires_at DATETIME DEFAULT (datetime('now', '+3 years')),
  expires_at DATETIME DEFAULT (datetime('now', '+1 year')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id, template_version) REFERENCES document_templates(id, version)
);

-- 4. Trilha de Auditoria Forense Criptográfica (Hash Chain Imutável)
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
  identity_method TEXT CHECK(identity_method IN ('matricula_sesi','manual_review')) NOT NULL DEFAULT 'matricula_sesi',
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
  tsa_timestamp_token TEXT,
  log_row_hash TEXT NOT NULL CHECK(LENGTH(log_row_hash) = 64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fila de Revisão Manual de Vínculos Familiares
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

-- 6. Gestão de Usuários Administrativos com RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL CHECK(email LIKE '%@%'),
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('operador','dpo','admin_master')) NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Atendimento a Direitos do Titular (LGPD Art. 18)
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

-- 8. Ancoragem de Merkle para Integridade Periódica
CREATE TABLE IF NOT EXISTS merkle_roots_anchors (
  id TEXT PRIMARY KEY,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  row_count INTEGER NOT NULL CHECK(row_count >= 0),
  merkle_root_sha256 TEXT NOT NULL CHECK(LENGTH(merkle_root_sha256) = 64),
  anchor_target TEXT NOT NULL,
  anchor_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIGGERS DE SEGURANÇA FÍSICA E IMUTABILIDADE FORENSE
-- ============================================================================

-- A. Bloqueio Físico contra Alterações ou Exclusões na Trilha de Auditoria
CREATE TRIGGER IF NOT EXISTS prevent_audit_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: audit_logs é estritamente imutável e somente append-only.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: Registros de auditoria criptográfica não podem ser apagados.');
END;

-- B. Bloqueio Físico contra Alterações ou Exclusões nas Âncoras da Árvore de Merkle
CREATE TRIGGER IF NOT EXISTS prevent_merkle_update
BEFORE UPDATE ON merkle_roots_anchors
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: As âncoras da Raiz de Merkle são definitivas e imutáveis.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_merkle_delete
BEFORE DELETE ON merkle_roots_anchors
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: As âncoras da Raiz de Merkle não podem ser deletadas.');
END;

-- C. Trava de Transição de Estado dos Documentos Assinados
CREATE TRIGGER IF NOT EXISTS prevent_signed_doc_reversion
BEFORE UPDATE ON documents
FOR EACH ROW
WHEN OLD.status = 'signed' AND NEW.status IN ('pending', 'draft')
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE INTEGRIDADE: Um termo assinado eletronicamente não pode retornar ao status pendente ou rascunho.');
END;

-- D. Bloqueio de Alteração em Conteúdo de Templates Já Publicados
CREATE TRIGGER IF NOT EXISTS prevent_template_text_alteration
BEFORE UPDATE ON document_templates
FOR EACH ROW
WHEN OLD.content_sha256 != NEW.content_sha256
BEGIN
  SELECT RAISE(ABORT, 'VIOLAÇÃO DE INTEGRIDADE: Modelos de termos já publicados não podem ter seu conteúdo alterado in-place. Crie uma nova versão.');
END;

-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE E BUSCA SEGURA
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_docs_token ON documents(access_token);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_docs_bindex ON documents(parent_email_bindex_sha256);
CREATE INDEX IF NOT EXISTS idx_audit_doc ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_manifest ON audit_logs(manifest_sha256);
CREATE INDEX IF NOT EXISTS idx_audit_cpf_masked ON audit_logs(signer_cpf_masked);
CREATE INDEX IF NOT EXISTS idx_inst_active ON institutions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_lgpd_status ON lgpd_requests(status);
CREATE INDEX IF NOT EXISTS idx_merkle_created ON merkle_roots_anchors(created_at);

-- ============================================================================
-- CARGA INICIAL DE DADOS (SEED DATA)
-- ============================================================================

-- 1. Template Oficial do Termo Escola Cidadã
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

-- 2. Escola / Instituição de Ensino Padrão (Rota Oficial)
INSERT OR IGNORE INTO institutions (id, name, short_name, city, state, is_active) VALUES
('cemeit', 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)', 'CEMEIT', 'Taguatinga', 'DF', 1);

-- 3. Usuário Administrador Master Padrão (Autenticação Corporativa Microsoft SSO / PBKDF2)
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
