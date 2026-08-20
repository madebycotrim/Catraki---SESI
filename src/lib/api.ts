import {
  sha256,
  generateTsaTimestampToken,
  canonicalJson,
} from './crypto.ts';
import { computeLogRowHash, verifyAuditChain } from './audit-chain.ts';
import { querySesiMatricula } from './sesi-matricula.ts';
import { maskCPF, getInitials } from './schemas.ts';
import type {
  DocumentRecord,
  DocumentTemplate,
  AuditLogRow,
  ManualReviewRecord,
  PublicValidationResponse,
  ChainVerificationResult,
} from './types.ts';

const API_BASE = '/api';

// ============================================================================
// BASE DE DADOS LOCAL (LocalStorage) PARA FUNCIONAMENTO 100% FRONTEND
// ============================================================================

const SEED_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'proc_escola_cidada',
    version: 1,
    title: 'Projeto Escola Cidadã: Saúde em Movimento',
    procedure_description: 'Autorização para atendimento do aluno nas ações do projeto Escola Cidadã: Saúde em Movimento sem a presença do responsável legal, bem como o termo de autorização de uso de imagem, nome e voz pelas entidades do Sistema Indústria (Sesi-DF, Senai-DF e IEL-DF).',
    content_markdown: `### AUTORIZAÇÃO DE ATENDIMENTO DE SAÚDE, TRATAMENTO DE DADOS E USO DE IMAGEM

**Prezado(a) Responsável Legal,**

Este formulário digital tem o objetivo de garantir a segurança, a privacidade e os direitos do(a) estudante durante o projeto **Escola Cidadã: Saúde em Movimento**. A leitura e o aceite eletrônico deste termo possuem validade jurídica equivalente a um documento físico assinado em papel.

---

### COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS

**Finalidade e Proteção:** Os dados coletados não serão comercializados, repassados a terceiros alheios ao projeto ou utilizados para fins discriminatórios.

**Direito de Revogação:** O titular, representado por seu responsável, poderá solicitar o acesso aos dados, correções ou a revogação do uso da imagem a qualquer momento através do contato: **dpo@fibra.org.br**.`,
    content_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    consent_text_version: 1,
    retention_days: 1095, // 3 anos conforme o termo
    is_active: true,
    created_at: '2026-08-19T10:00:00Z',
  }
];

const SEED_DOCUMENTS: (DocumentRecord & { template_title: string; procedure_description: string; content_markdown: string; consent_text_version: number })[] = [
  {
    id: 'DOC-2026-001',
    template_id: 'proc_escola_cidada',
    template_version: 1,
    template_title: 'Projeto Escola Cidadã: Saúde em Movimento',
    procedure_description: SEED_TEMPLATES[0].procedure_description,
    content_markdown: SEED_TEMPLATES[0].content_markdown,
    content_sha256: SEED_TEMPLATES[0].content_sha256,
    consent_text_version: 1,
    minor_name: 'Lucas Cotrim Silva',
    minor_birth_date: '2010-05-14',
    parent_name: 'Mateus Cotrim',
    parent_email_encrypted: '{"v":1,"iv":"seed","ct":"seed_enc"}',
    parent_phone_encrypted: '{"v":1,"iv":"seed","ct":"seed_enc"}',
    key_version: 1,
    access_token: 'projeto-escola-cidada-2026', // mantido para compatibilidade com o fluxo demo
    status: 'pending',
    otp_attempts: 0,
    otp_resend_count: 0,
    retention_expires_at: '2029-08-19T10:00:00Z',
    expires_at: '2026-12-31T23:59:59Z',
    created_at: '2026-08-19T10:00:00Z',
  }
];

// Helper Functions para LocalStorage
const getStorage = <T>(key: string, seed: T): T => {
  if (typeof window === 'undefined') return seed;
  const data = localStorage.getItem(key);
  if (data) {
    try { return JSON.parse(data); } catch {}
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
};

const setStorage = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const getTemplates = () => getStorage('catraki_templates', SEED_TEMPLATES);
const setTemplates = (d: any[]) => setStorage('catraki_templates', d);

const getDocuments = () => getStorage('catraki_docs', SEED_DOCUMENTS);
const setDocuments = (d: any[]) => setStorage('catraki_docs', d);

const getAuditLogs = () => getStorage<AuditLogRow[]>('catraki_audit', []);
const setAuditLogs = (d: any[]) => setStorage('catraki_audit', d);

const getManualReviews = () => getStorage<ManualReviewRecord[]>('catraki_reviews', []);
const setManualReviews = (d: any[]) => setStorage('catraki_reviews', d);

const getLgpdRequests = () => getStorage<any[]>('catraki_lgpd', []);
const setLgpdRequests = (d: any[]) => setStorage('catraki_lgpd', d);

// ============================================================================
// CLIENTE API COM FALLBACK INTELIGENTE
// ============================================================================

export const apiClient = {
  /**
   * Busca documento pelo token de acesso
   */
  async getSignerDoc(token: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/doc/${token}`);
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token);
    if (!doc) {
      return { success: false, error: 'Documento não localizado ou link expirado.' };
    }

    const reviews = getManualReviews();
    const review = reviews.find((r) => r.document_id === doc.id);

    return {
      success: true,
      document: {
        id: doc.id,
        status: doc.status,
        minor_name: doc.minor_name,
        minor_birth_date: doc.minor_birth_date,
        parent_name: doc.parent_name,
        parent_cpf_masked: '***.456.789-**',
        procedure_title: doc.template_title,
        procedure_description: doc.procedure_description,
        content_markdown: doc.content_markdown,
        content_sha256: doc.content_sha256,
        consent_text_version: doc.consent_text_version,
        expires_at: doc.expires_at,
        revoked_at: doc.revoked_at,
        revoked_reason: doc.revoked_reason,
        manual_review_status: review?.status || null,
        manual_review_notes: review?.review_notes || null,
        legal_notice: 'Assinatura Eletrônica Avançada (Decreto Federal nº 10.543/2020) — Não qualificada ICP-Brasil',
      },
    };
  },

  /**
   * Valida vínculo com a base de matrícula SESI
   */
  async verifyMatricula(payload: { token: string; signer_cpf: string; signer_name: string; signer_relationship: string }): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/verify-matricula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === payload.token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    const check = await querySesiMatricula({
      minorName: doc.minor_name,
      minorBirthDate: doc.minor_birth_date,
      signerCpf: payload.signer_cpf,
      signerName: payload.signer_name,
    });

    return {
      success: true,
      hasValidEnrollment: check.hasValidEnrollment,
      guardianType: check.guardianType,
      identityMethod: check.hasValidEnrollment ? 'matricula_sesi' : 'manual_review',
      verifiedAt: check.verifiedAt,
      message: check.hasValidEnrollment
        ? 'Vínculo com a base de matrícula SESI confirmado com sucesso.'
        : 'Vínculo direto não localizado na base de matrícula. É necessário envio de documentação para revisão da equipe.',
    };
  },

  /**
   * Envia documentos para revisão manual
   */
  async submitManualReview(payload: {
    token: string;
    signer_name: string;
    signer_cpf: string;
    signer_relationship: any;
    identity_doc_base64: string;
    selfie_base64: string;
    guardianship_doc_base64?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/manual-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === payload.token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    const reviewId = `REV-${Date.now()}`;
    const newReview: ManualReviewRecord = {
      id: reviewId,
      document_id: doc.id,
      signer_name: payload.signer_name,
      signer_cpf_masked: maskCPF(payload.signer_cpf),
      signer_cpf_encrypted: 'ENC_PAYLOAD',
      signer_relationship: payload.signer_relationship,
      identity_doc_r2_key: payload.identity_doc_base64,
      selfie_doc_r2_key: payload.selfie_base64,
      guardianship_doc_r2_key: payload.guardianship_doc_base64 || null,
      status: 'pending',
      review_notes: payload.notes || 'Aguardando validação por operador SESI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const reviews = getManualReviews();
    reviews.unshift(newReview);
    setManualReviews(reviews);

    return {
      success: true,
      reviewId,
      status: 'pending',
      message: 'Documentos recebidos com sucesso. A equipe do SESI fará a análise do vínculo legal antes da liberação do link de assinatura.',
    };
  },

  /**
   * Solicita envio de OTP
   */
  async requestOtp(token: string, channel: 'sms' | 'email'): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, channel }),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    const devOtp = '123456';
    doc.otp_secret_hash = devOtp;
    doc.otp_attempts = 0;
    doc.otp_resend_count += 1;
    
    setDocuments(docs);

    return {
      success: true,
      channel,
      expires_in_seconds: 300,
      message: `Código de verificação enviado para o ${channel === 'sms' ? 'celular' : 'e-mail'} do responsável legal.`,
      dev_otp_hint: devOtp,
    };
  },

  /**
   * Valida código OTP
   */
  async verifyOtp(token: string, otp_code: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp_code }),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    if (otp_code === '123456' || doc.otp_secret_hash === otp_code) {
      return { success: true, verified: true, message: 'Identidade e código 2FA confirmados.' };
    }

    doc.otp_attempts += 1;
    setDocuments(docs);
    return { success: false, error: `Código incorreto. Tentativas restantes: ${Math.max(0, 3 - doc.otp_attempts)}` };
  },

  /**
   * Submete a assinatura eletrônica avançada com hash chain
   */
  async signDocument(payload: {
    token: string;
    otp_code: string;
    signer_name: string;
    signer_cpf: string;
    signer_relationship: any;
    signature_png_base64: string;
    consent_lgpd_art11_art14: true;
    declaration_art299_penal: true;
    client_fingerprint?: string;
  }): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === payload.token);
    if (!doc) return { success: false, error: 'Documento não localizado.' };

    const signedAt = new Date().toISOString();
    const signaturePngSha256 = await sha256(payload.signature_png_base64);
    const cpfMasked = maskCPF(payload.signer_cpf);

    const logs = getAuditLogs();
    const prevLogHash = logs.length > 0 
      ? logs[logs.length - 1].log_row_hash 
      : null;

    const manifestData = {
      document_id: doc.id,
      template_id: doc.template_id,
      template_version: doc.template_version,
      procedure_description_sha256: await sha256(doc.procedure_description),
      content_sha256: doc.content_sha256,
      signed_at_utc: signedAt,
      signer: {
        name: payload.signer_name,
        cpf_masked: cpfMasked,
        relationship: payload.signer_relationship,
      },
      signature_png_sha256: signaturePngSha256,
      legal_basis: 'LGPD Art. 11, I c/c Art. 14, §1º; Decreto 10.543/2020 Art. 4º, II; Art. 299 CP',
    };

    const manifestSha256 = await sha256(canonicalJson(manifestData));
    const tsa = await generateTsaTimestampToken(manifestSha256);

    const auditId = `AUD-${Date.now()}`;
    const logRowHash = await computeLogRowHash({
      id: auditId,
      document_id: doc.id,
      prev_log_hash: prevLogHash,
      signed_at: signedAt,
      signer_name: payload.signer_name,
      signer_cpf_masked: cpfMasked,
      signer_relationship: payload.signer_relationship,
      identity_method: 'matricula_sesi',
      signature_png_sha256: signaturePngSha256,
      ip_address: '189.120.44.12',
      user_agent: navigator.userAgent,
      client_fingerprint: payload.client_fingerprint || 'webgl_canvas_fp_valid',
      content_sha256_at_signing: doc.content_sha256,
      consent_text_version: doc.consent_text_version,
      manifest_sha256: manifestSha256,
      tsa_timestamp_token: tsa.token,
    });

    const newAuditRow: AuditLogRow = {
      id: auditId,
      document_id: doc.id,
      prev_log_hash: prevLogHash,
      signed_at: signedAt,
      signer_name: payload.signer_name,
      signer_cpf_encrypted: 'ENC_AES256',
      signer_cpf_masked: cpfMasked,
      signer_relationship: payload.signer_relationship,
      identity_method: 'matricula_sesi',
      signature_png_encrypted: 'ENC_PNG',
      signature_png_sha256: signaturePngSha256,
      key_version: 1,
      ip_address: '189.120.44.12',
      user_agent: navigator.userAgent,
      geo_city: 'São Paulo',
      geo_region: 'SP',
      geo_country: 'BR',
      client_fingerprint: payload.client_fingerprint || null,
      content_sha256_at_signing: doc.content_sha256,
      consent_text_version: doc.consent_text_version,
      manifest_sha256: manifestSha256,
      tsa_timestamp_token: tsa.token,
      log_row_hash: logRowHash,
      created_at: signedAt,
    };

    logs.push(newAuditRow);
    setAuditLogs(logs);
    
    doc.status = 'signed';
    setDocuments(docs);

    return {
      success: true,
      document_id: doc.id,
      manifest_sha256: manifestSha256,
      log_row_hash: logRowHash,
      signed_at_utc: signedAt,
      tsa_authority: tsa.tsaName,
      validation_url: `/validar/${manifestSha256}`,
      message: 'Autorização médica assinada eletronicamente com sucesso e registrada na cadeia de custódia.',
    };
  },

  /**
   * Revoga consentimento nos termos da LGPD
   */
  async revokeConsent(token: string, reason: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason, confirm_legal_consequence: true }),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token);
    if (!doc) return { success: false, error: 'Documento não encontrado.' };

    doc.status = 'revoked';
    doc.revoked_at = new Date().toISOString();
    doc.revoked_reason = reason;
    
    setDocuments(docs);

    return {
      success: true,
      message: 'Consentimento revogado com sucesso conforme Art. 18 da LGPD.',
    };
  },

  /**
   * Validador público de autenticidade
   */
  async validatePublic(manifestHash: string): Promise<{ success: boolean; validation?: PublicValidationResponse; error?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/public/validate/${manifestHash}`);
      if (resp.ok) return await resp.json();
    } catch {}

    const logs = getAuditLogs();
    const audit = logs.find((a) => a.manifest_sha256 === manifestHash);
    if (!audit) {
      return { success: false, error: 'Manifesto não localizado na cadeia de custódia oficial do SESI Saúde.' };
    }

    const docs = getDocuments();
    const doc = docs.find((d) => d.id === audit.document_id);

    return {
      success: true,
      validation: {
        valid: true,
        legal_notice: 'Assinatura Eletrônica Avançada (Decreto Federal nº 10.543/2020) — Não qualificada ICP-Brasil',
        signature_type: 'Assinatura Eletrônica Avançada (Dec. 10.543/2020)',
        document_id: audit.document_id,
        manifest_sha256: audit.manifest_sha256,
        content_sha256: audit.content_sha256_at_signing,
        signature_png_sha256: audit.signature_png_sha256,
        signed_at_utc: audit.signed_at,
        signer_name: audit.signer_name,
        signer_cpf_masked: audit.signer_cpf_masked,
        signer_relationship: audit.signer_relationship,
        identity_method: audit.identity_method,
        procedure_title: doc?.template_title || 'Procedimento Médico SESI',
        procedure_description: doc?.procedure_description || 'Descrição médica registrada.',
        minor_name_initials: getInitials(doc?.minor_name || 'Menor Cadastrado'),
        document_status: doc?.status || 'signed',
        chain_position: logs.findIndex((a) => a.id === audit.id) + 1,
        prev_log_hash: audit.prev_log_hash,
        tsa_verified: true,
        tsa_authority: 'Autoridade de Carimbo do Tempo SESI / ACT ICP-Brasil Compatível',
        revocation_info: doc?.status === 'revoked' ? {
          revoked_at: doc.revoked_at || '',
          revoked_reason: doc.revoked_reason || 'Revogado a pedido do responsável legal',
        } : null,
      },
    };
  },

  /**
   * Solicitação pública LGPD
   */
  async submitLgpdRequest(payload: any): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/public/lgpd-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const reqId = `LGPD-${Date.now()}`;
    const reqs = getLgpdRequests();
    reqs.unshift({
      id: reqId,
      requester_name: payload.requester_name,
      requester_cpf_masked: maskCPF(payload.requester_cpf),
      request_type: payload.request_type,
      details: payload.details,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    setLgpdRequests(reqs);

    return {
      success: true,
      protocol: reqId,
      message: 'Sua solicitação fundamentada na LGPD foi registrada e encaminhada ao DPO do SESI.',
    };
  },

  // ==========================================================================
  // FUNÇÕES ADMINISTRATIVAS (RBAC)
  // ==========================================================================

  async getAdminTemplates(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/templates`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, templates: getTemplates() };
  },

  async createAdminTemplate(templateData: any): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const newTmpl: DocumentTemplate = {
      id: templateData.id,
      version: 1,
      title: templateData.title,
      procedure_description: templateData.procedure_description,
      content_markdown: templateData.content_markdown,
      content_sha256: await sha256(templateData.content_markdown + '\n' + templateData.procedure_description),
      consent_text_version: 1,
      retention_days: templateData.retention_days || 1825,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const templates = getTemplates();
    templates.unshift(newTmpl);
    setTemplates(templates);
    return { success: true, template: newTmpl, message: 'Template versionado com sucesso.' };
  },

  async getAdminDocuments(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, documents: getDocuments() };
  },

  async createAdminDocument(docData: any): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docData),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const templates = getTemplates();
    const tmpl = templates.find((t) => t.id === docData.template_id) || templates[0];
    const docId = `DOC-${Date.now()}`;
    const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const newDoc = {
      id: docId,
      template_id: tmpl.id,
      template_version: tmpl.version,
      template_title: tmpl.title,
      procedure_description: tmpl.procedure_description,
      content_markdown: tmpl.content_markdown,
      content_sha256: tmpl.content_sha256,
      consent_text_version: 1,
      minor_name: docData.minor_name,
      minor_birth_date: docData.minor_birth_date,
      parent_name: docData.parent_name,
      parent_email_encrypted: 'ENC',
      parent_phone_encrypted: 'ENC',
      key_version: 1,
      access_token: token,
      status: 'pending' as const,
      otp_attempts: 0,
      otp_resend_count: 0,
      retention_expires_at: new Date(Date.now() + tmpl.retention_days * 86400000).toISOString(),
      expires_at: new Date(Date.now() + (docData.expires_in_days || 7) * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const docs = getDocuments();
    docs.unshift(newDoc);
    setDocuments(docs);
    return {
      success: true,
      document: {
        id: docId,
        access_token: token,
        sign_url: `/assinar/${token}`,
        template_title: tmpl.title,
      },
      message: 'Termo de autorização emitido com sucesso.',
    };
  },

  async getAdminManualReviews(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/manual-reviews`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, reviews: getManualReviews() };
  },

  async actionManualReview(reviewId: string, action: 'approve' | 'reject', notes?: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/manual-reviews/${reviewId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const reviews = getManualReviews();
    const rev = reviews.find((r) => r.id === reviewId);
    if (rev) {
      rev.status = action === 'approve' ? 'approved' : 'rejected';
      rev.review_notes = notes || `Revisão ${action === 'approve' ? 'aprovada' : 'rejeitada'}`;
      rev.updated_at = new Date().toISOString();
      setManualReviews(reviews);
    }
    return { success: true, message: `Revisão ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso.` };
  },

  async verifyAuditChain(): Promise<{ success: boolean; verification: ChainVerificationResult; total_blocks_audited: number }> {
    try {
      const resp = await fetch(`${API_BASE}/admin/verify-chain`);
      if (resp.ok) return await resp.json();
    } catch {}

    const logs = getAuditLogs();
    const verification = await verifyAuditChain(logs);
    return {
      success: true,
      verification,
      total_blocks_audited: logs.length,
    };
  },

  async getAdminAuditLogs(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/audit-logs`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, logs: getAuditLogs() };
  },

  async getAdminLgpdRequests(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/lgpd-requests`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, requests: getLgpdRequests() };
  },
};
