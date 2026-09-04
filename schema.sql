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
    retention_days INTEGER NOT NULL DEFAULT 7300, -- 20 anos (Prazo legal de guarda de termos de consentimento)
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
    minor_cpf TEXT,                                    -- CPF legado (plain) — não usar em novos registros
    minor_cpf_encrypted TEXT,                          -- CPF do menor criptografado AES-GCM-256 (Privacy by Design - LGPD Art. 46)
    minor_cpf_bindex_sha256 TEXT,                      -- Blind Index SHA-256 para buscas seguras sem expor o CPF (LGPD)
    minor_series TEXT,
    minor_class TEXT,
    minor_turn TEXT,
    parent_name TEXT,
    parent_email_encrypted TEXT,
    parent_phone_encrypted TEXT,
    parent_email_bindex_sha256 TEXT, -- Blind index SHA-256 para buscas seguras e sigilosas (LGPD)
    auth_image TEXT,
    auth_health TEXT,
    auth_data TEXT,
    terms_version TEXT NOT NULL DEFAULT '1.0',
    token_sent_at DATETIME,
    token_ttl_days INTEGER NOT NULL DEFAULT 3,
    key_version INTEGER NOT NULL DEFAULT 1,
    access_token TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('draft','pending','signed','revoked','expired','CANCELADO_POR_ERRO','cancelled_error')) DEFAULT 'pending',
    otp_secret_hash TEXT,
    otp_attempts INTEGER DEFAULT 0 CHECK(otp_attempts >= 0 AND otp_attempts <= 5),
    otp_expires_at DATETIME,
    otp_resend_count INTEGER DEFAULT 0 CHECK(otp_resend_count >= 0 AND otp_resend_count <= 10),
    signed_pdf_r2_key TEXT,
    created_by_admin TEXT,
    revoked_at DATETIME,
    revoked_reason TEXT,
    cancelled_at DATETIME,
    cancelled_by_admin_id TEXT,
    cancellation_reason TEXT,
    cancellation_ip TEXT,
    revocation_notification_sent_at DATETIME,          -- Timestamp de envio do e-mail transacional de revogação (LGPD Art. 18)
    integrity_alert_at DATETIME,                       -- Timestamp do alerta de adulteração detectado pelo cron (Lei 14.063/2020)
    integrity_alert_reason TEXT,                       -- Descrição técnica da divergência de hash detectada
    otp_requested_at DATETIME,
    otp_verified_at DATETIME,
    otp_email_message_id TEXT,
    otp_delivery_status TEXT,
    doc_parent_hash_sha256 TEXT,
    retention_expires_at DATETIME DEFAULT (datetime('now', '+20 years')),
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
    identity_method TEXT CHECK(identity_method IN ('matricula_sesi','declaracao_responsavel')) NOT NULL DEFAULT 'matricula_sesi',
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

  -- 5. Gestão de Usuários Administrativos com RBAC
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL CHECK(email LIKE '%@%'),
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('operador','dpo','admin_master')) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_login_at DATETIME,                            -- Último login bem-sucedido (segurança RBAC e auditoria)
    failed_login_count INTEGER DEFAULT 0,              -- Contador de tentativas falhas consecutivas (bloqueio por força bruta)
    mfa_enabled BOOLEAN DEFAULT 0,                    -- Flag de MFA habilitado para este administrador
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

  -- 9. Trilha de Auditoria Imutável de Revogação e Cancelamento por Erro Operacional
  CREATE TABLE IF NOT EXISTS document_cancellation_audits (
    id TEXT PRIMARY KEY,                       -- Ex: 'CANCEL-20260825-103000-A1B2'
    document_id TEXT NOT NULL REFERENCES documents(id),
    cancelled_at DATETIME NOT NULL,            -- Data e hora exata UTC com fuso horário ISO-8601
    ip_address TEXT NOT NULL,                  -- IP de origem do operador (Art. 15 da Lei 12.965/2014 - Marco Civil)
    user_agent TEXT NOT NULL,                  -- User-Agent / Navegador de quem comandou
    cancelled_by_user_id TEXT NOT NULL,        -- ID do usuário / funcionário no sistema
    cancelled_by_user_email TEXT NOT NULL,     -- E-mail do operador autenticado
    cancelled_by_role TEXT NOT NULL,           -- Perfil de permissão (RBAC: operador, admin_master, dpo)
    justification TEXT NOT NULL,               -- Justificativa detalhada obrigatória
    document_manifest_sha256 TEXT,             -- Hash SHA-256 do documento / manifesto no cancelamento
    log_row_hash TEXT NOT NULL CHECK(LENGTH(log_row_hash) = 64), -- Hash SHA-256 para integridade e não repúdio
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 9. Trilha de Auditoria de Ações Administrativas e de Segurança (Append-Only)
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,                       -- Ex: 'ADM-20260825-103000-A1B2'
    event_type TEXT NOT NULL,                  -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LGPD_RESPONSE', 'INSTITUTION_ACTION', 'TEMPLATE_CREATE', 'DATA_EXPORT'
    actor_user_id TEXT NOT NULL,               -- ID do operador
    actor_user_email TEXT NOT NULL,            -- E-mail do operador
    actor_user_role TEXT NOT NULL,             -- Perfil RBAC
    ip_address TEXT NOT NULL,                  -- IP de origem (Art. 15 Marco Civil)
    user_agent TEXT NOT NULL,
    target_resource TEXT NOT NULL,             -- Recurso afetado (ex: 'document:DOC-123')
    action_details TEXT NOT NULL,              -- JSON ou texto com diff/motivo/contagem
    log_row_hash TEXT NOT NULL CHECK(LENGTH(log_row_hash) = 64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 11. Registros de Acesso a Aplicações (Marco Civil da Internet - Art. 15 da Lei 12.965/2014)
  CREATE TABLE IF NOT EXISTS application_access_logs (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    endpoint_path TEXT NOT NULL,
    http_method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    session_token_hash TEXT,
    retention_until DATETIME DEFAULT (datetime('now', '+180 days')), -- 6 meses regulatórios
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 12. Gestão e Ciclo de Vida de Chaves Criptográficas (AES-GCM-256)
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

  -- E. Bloqueio Absoluto de Exclusão Física em Documentos (Soft Delete Obrigatório - LGPD/Marco Civil/Lei 14.063)
  CREATE TRIGGER IF NOT EXISTS prevent_document_delete
  BEFORE DELETE ON documents
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO LEGAL (LGPD/Marco Civil/Lei 14.063): É expressamente proibida a exclusão física (DELETE) de documentos ou autorizações. Utilize o cancelamento de estado com status CANCELADO_POR_ERRO para preservar a cadeia de custódia e evidências digitais.');
  END;

  -- F. Bloqueio Físico contra Alterações ou Exclusões na Trilha de Auditoria de Cancelamento
  CREATE TRIGGER IF NOT EXISTS prevent_cancellation_audit_update
  BEFORE UPDATE ON document_cancellation_audits
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: Registros de auditoria de cancelamento por erro são imutáveis (append-only).');
  END;

  CREATE TRIGGER IF NOT EXISTS prevent_cancellation_audit_delete
  BEFORE DELETE ON document_cancellation_audits
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: Registros de auditoria de cancelamento não podem ser apagados sob hipótese alguma.');
  END;

  -- G. Modo Somente-Leitura para Documentos com Status CANCELADO_POR_ERRO
  CREATE TRIGGER IF NOT EXISTS prevent_cancelled_doc_modification
  BEFORE UPDATE ON documents
  FOR EACH ROW
  WHEN OLD.status IN ('CANCELADO_POR_ERRO', 'cancelled_error') AND NEW.status != OLD.status
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE INTEGRIDADE: Documentos cancelados por inconsistência operacional entram em modo somente-leitura definitivo e não podem ser reativados.');
  END;

  -- H. Bloqueio Físico contra Alterações ou Exclusões na Trilha de Auditoria Administrativa
  CREATE TRIGGER IF NOT EXISTS prevent_admin_audit_update
  BEFORE UPDATE ON admin_audit_logs
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: admin_audit_logs é estritamente imutável (append-only).');
  END;

  CREATE TRIGGER IF NOT EXISTS prevent_admin_audit_delete
  BEFORE DELETE ON admin_audit_logs
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE SEGURANÇA: Registros de auditoria administrativa não podem ser apagados sob hipótese alguma.');
  END;

  -- I. Bloqueio de Exclusão Física em Templates, Solicitações LGPD e Escolas
  CREATE TRIGGER IF NOT EXISTS prevent_templates_delete
  BEFORE DELETE ON document_templates
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO LEGAL: Modelos e termos de consentimento não podem sofrer exclusão física. Utilize is_active = 0.');
  END;

  CREATE TRIGGER IF NOT EXISTS prevent_lgpd_requests_delete
  BEFORE DELETE ON lgpd_requests
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO LEGAL (LGPD Art. 18): Protocolos de atendimento ao titular devem ser mantidos permanentemente para auditoria da ANPD.');
  END;

  CREATE TRIGGER IF NOT EXISTS prevent_institutions_delete
  BEFORE DELETE ON institutions
  BEGIN
    SELECT RAISE(ABORT, 'VIOLAÇÃO DE INTEGRIDADE: Escolas participantes devem ser desativadas logicamente (is_active = 0) para manter o histórico das rotas.');
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
  CREATE INDEX IF NOT EXISTS idx_cancel_doc ON document_cancellation_audits(document_id);
  CREATE INDEX IF NOT EXISTS idx_cancel_created ON document_cancellation_audits(created_at);
  CREATE INDEX IF NOT EXISTS idx_cancel_user ON document_cancellation_audits(cancelled_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_event ON admin_audit_logs(event_type);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs(actor_user_id);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_access_logs_retention ON application_access_logs(retention_until);
  CREATE INDEX IF NOT EXISTS idx_access_logs_ip ON application_access_logs(ip_address);
  CREATE INDEX IF NOT EXISTS idx_docs_minor_cpf_bindex ON documents(minor_cpf_bindex_sha256);
  CREATE INDEX IF NOT EXISTS idx_docs_integrity_alert ON documents(integrity_alert_at);
  CREATE INDEX IF NOT EXISTS idx_admin_last_login ON admin_users(last_login_at);

  -- ============================================================================
  -- TABELAS DE PRONTIDÃO ICP-BRASIL, MFA E GESTÃO DE CHAVES (Privacy by Design)
  -- Lei 14.063/2020 Art. 4º, II e III; LGPD Art. 46; MP 2.200-2/2001
  -- ============================================================================

  -- 12. Gestão de Versões de Chaves de Criptografia (AES-256 Key Rotation)
  CREATE TABLE IF NOT EXISTS encryption_key_versions (
    version INTEGER PRIMARY KEY,                       -- Versão sequencial da chave (compatível com key_version nos documentos)
    key_sha256_fingerprint TEXT NOT NULL,              -- Hash SHA-256 da chave pública/fingerprint (nunca a chave em si)
    algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',    -- Algoritmo de criptografia
    status TEXT CHECK(status IN ('active','retired','compromised')) NOT NULL DEFAULT 'active',
    activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retired_at DATETIME,
    created_by TEXT NOT NULL,                          -- ID do admin_master que ativou a chave
    notes TEXT
  );

  -- Índices para novas tabelas de conformidade
  CREATE INDEX IF NOT EXISTS idx_enc_key_status ON encryption_key_versions(status);

  -- Seed: Registro da versão 1 da chave de criptografia AES-256
  INSERT OR IGNORE INTO encryption_key_versions (version, key_sha256_fingerprint, algorithm, status, activated_at, created_by, notes)
  VALUES (1, 'v1-fingerprint-configurar-via-env-ENCRYPTION_KEY_V1', 'AES-GCM-256', 'active', datetime('now'), 'USR-ADMIN-MASTER', 'Chave mestra inicial — fingerprint deve ser atualizado com o SHA-256 da chave real configurada em ENCRYPTION_KEY_V1');

  -- ============================================================================
  -- CARGA INICIAL DE DADOS (SEED DATA)
  -- ============================================================================

  -- 1. Template Oficial do Termo Escola Cidadã
  INSERT OR IGNORE INTO document_templates (
    id, version, title, procedure_description, content_markdown, content_sha256, consent_text_version, retention_days, is_active
  ) VALUES (
    'proc_escola_cidada',
    1,
    'Escola Cidadã: Saúde em Movimento',
    'Autorização para atendimento do aluno nas ações do projeto Escola Cidadã: Saúde em Movimento (UnB + SESI-DF), sem a presença do responsável legal, com consentimento granular para tratamento de dados pessoais (LGPD) e uso de imagem, nome e voz (ECA/Art. 17).',
    '## TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO DIGITAL (TCLE)
  ### Autorização de Atendimento de Saúde, Tratamento de Dados e Uso de Imagem

  Prezado(a) Responsável Legal,

  Este formulário digital tem o objetivo de garantir a segurança, a privacidade e os direitos do(a) estudante durante o projeto **Escola Cidadã — Saúde em Movimento**. A leitura e o aceite eletrônico deste termo possuem validade jurídica equivalente a um documento físico assinado em papel.

  ---

  ## 1. IDENTIFICAÇÃO DAS PARTES

  ### DADOS DO RESPONSÁVEL LEGAL (Quem autoriza)

  - **Nome Completo:** [Preenchido na etapa seguinte]
  - **CPF:** [Preenchido na etapa seguinte]
  - **Vínculo com o(a) menor:** Mãe / Pai / Tutor(a) / Outro
  - **Telefone (WhatsApp) e E-mail:** [Preenchidos na etapa seguinte]
  - **Endereço Completo:** [Preenchido na etapa seguinte]

  ### DADOS DO(A) ESTUDANTE (Quem receberá o atendimento)

  - **Nome Completo:** [Preenchido automaticamente pela plataforma]
  - **Data de Nascimento e CPF:** [Preenchidos automaticamente]
  - **Escola / Instituição:** [Escola do estudante — Projeto itinerante]
  - **Série, Turma e Turno:** [Preenchidos na etapa seguinte]

  ---

  ## 2. SOBRE O PROJETO

  O **Escola Cidadã: Saúde em Movimento** é uma iniciativa de extensão da **Universidade de Brasília (UnB)**, por meio da Faculdade de Ciências da Saúde (FS/UnB), realizada em parceria com o **Serviço Social da Indústria do Distrito Federal (SESI-DF)**, mediante acordo de cooperação técnica. O projeto é financiado por emenda parlamentar da Bancada do Distrito Federal.

  **Público-alvo:** Estudantes e comunidade a partir de 14 anos, matriculados em escolas públicas do Distrito Federal.

  **Serviços ofertados pelo SESI-DF:** atendimentos odontológicos, oftalmológicos e fonoaudiológicos, além de terapia comunitária integrativa e oficinas de alimentação saudável. A UnB oferece oficinas de educomunicação em saúde.

  **Regiões atendidas:** Asa Norte, Arapoanga, Ceilândia, Gama, Sobradinho, Taguatinga, São Sebastião, Santa Maria, Recanto das Emas, Paranoá e Itapoã.

  ---

  ## 3. PAINEL DE AUTORIZAÇÕES DIGITAIS

  A Lei Geral de Proteção de Dados (**LGPD — Lei nº 13.709/2018**) exige que seu consentimento seja **livre, informado e específico**. Por isso, cada autorização abaixo é independente e deve ser respondida individualmente na etapa de preenchimento.

  ---

  ### A. SOBRE O ATENDIMENTO DE SAÚDE *(Obrigatório para participação)*

  **⚠ Atenção: A recusa neste item impede a participação do(a) estudante no projeto.**

  > **(A1) AUTORIZO** a realização do atendimento de saúde (odontológico, oftalmológico, fonoaudiológico, terapia comunitária e oficinas de saúde), triagem e avaliação no(a) estudante pelos profissionais do SESI-DF e da UnB, **sem a minha presença física no momento**, durante o horário escolar. Comprometo-me a orientar o(a) menor a portar seu documento de identidade com CPF.

  > **(A2) NÃO AUTORIZO** o atendimento de saúde. *(Impede a participação.)*

  **Base Legal:** Art. 7º, II e III, e Art. 14 da LGPD; Art. 98 do ECA (emergências).

  ---

  ### B. SOBRE OS DADOS PESSOAIS E DE SAÚDE *(Obrigatório para participação)*

  **⚠ Atenção: A recusa neste item impede a participação do(a) estudante no projeto.**

  > **(B1) AUTORIZO** a coleta, armazenamento e tratamento dos dados de consentimento e informações de identificação do(a) estudante pela UnB e SESI-DF, nos termos do **Art. 14 da LGPD**, para fins exclusivos de registro e comprovação da permissão legal de participação nas atividades de promoção da saúde.

  > **(B2) NÃO AUTORIZO** o tratamento de dados. *(Impede a participação.)*

  **Dados coletados:** nome completo, CPF do(a) estudante e do(a) responsável, data de nascimento, escola/turma e dados de auditoria da assinatura (IP, timestamp, geolocalização).

  **Base Legal:** Art. 7º, I, Art. 11, I, e Art. 14 da LGPD; Art. 46 da LGPD (segurança dos dados).

  ---

  ### C. SOBRE O USO DE IMAGEM E VOZ *(Opcional — não impede o atendimento)*

  > **(C1) AUTORIZO** de forma gratuita o uso da imagem e voz do(a) estudante em fotos e vídeos do projeto, pela **Universidade de Brasília (UnB)** e **SESI-DF**, exclusivamente para documentação, relatórios institucionais, peças de comunicação e divulgação do projeto em canais oficiais (site, redes sociais institucionais, materiais impressos), respeitando a dignidade e os direitos do(a) menor, nos termos do **Art. 17 do ECA**.

  > **(C2) NÃO AUTORIZO** o uso da imagem. *(O(a) estudante participará normalmente de todos os atendimentos e não será fotografado(a) ou filmado(a).)*

  **É expressamente proibido** o uso das imagens para fins comerciais, vexatórios, humilhantes ou discriminatórios, sob pena do **Art. 241 do ECA**.

  ---

  ## 4. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS *(Art. 18, LGPD)*

  **Finalidade e Proteção:** Os dados coletados não serão comercializados, repassados a terceiros alheios ao projeto ou utilizados para fins discriminatórios.

  **Direito de Revogação:** O titular, representado por seu responsável, poderá solicitar o acesso aos dados, correções ou a revogação deste consentimento a qualquer momento, procurando a equipe de apoio presencial do projeto ou a coordenação da escola.

  **Seus direitos garantidos:** acesso, correção, eliminação, portabilidade, revogação do consentimento e reclamação perante a **ANPD** (anpd.gov.br).

  ---

  ## 5. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA

  Declaro, sob as penas da lei (**Art. 299 do Código Penal — Falsidade Ideológica**, reclusão de 1 a 3 anos), que sou o(a) legítimo(a) responsável legal do(a) menor acima qualificado(a) e que as informações por mim inseridas nesta plataforma são verdadeiras.

  As partes (entidades promotoras e o signatário) concordam expressamente em assinar este termo por meio eletrônico através da plataforma Catraki, reconhecendo mutuamente este método como dotado de **eficácia probatória e validade jurídica**, nos termos do **Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001**, da **Lei nº 14.063/2020**, dos **Arts. 104 e 107 do Código Civil**, dos **Arts. 411 e 441 do Código de Processo Civil** e da jurisprudência consolidada do Superior Tribunal de Justiça (**STJ - REsp 2.205.708/PR**).

  Estou ciente e concordo que a plataforma registrará e armazenará, de forma segura, os seguintes dados para fins de comprovação de autoria e auditoria da integridade da minha assinatura:

  - **Endereço IP** do dispositivo utilizado (Autoria);
  - **Data e Hora (Timestamp)** do registro em UTC (Autoria);
  - **Hash SHA-256** deste documento (Integridade - garantia de que o documento não foi alterado após a assinatura);
  - **Dados do navegador/dispositivo** e **geolocalização** (Autoria).

  ---

  *Ao prosseguir e confirmar a leitura, você avançará para a etapa de preenchimento dos seus dados e registro individual de cada autorização (A, B e C). O aceite final ocorre somente após o preenchimento completo e a assinatura eletrônica.*',
    '5d98b3c1ad95490eba3b6339902569637cb26659bbaefc481b6e8c9edf5261da',
    1,
    7300,
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
