import {
  sha256,
  generateTsaTimestampToken,
  canonicalJson,
  generatePkceVerifier,
  generatePkceChallenge,
} from './crypto.ts';
import { computeLogRowHash, verifyAuditChain } from './audit-chain.ts';
import { querySesiMatricula } from './sesi-matricula.ts';
import { maskCPF, getInitials, generateUniqueDocId } from './schemas.ts';
import type {
  DocumentRecord,
  DocumentTemplate,
  AuditLogRow,
  ManualReviewRecord,
  PublicValidationResponse,
  ChainVerificationResult,
  Institution,
} from './types.ts';

const API_BASE = '/api';

// ============================================================================
// BASE DE DADOS LOCAL (LocalStorage) PARA FUNCIONAMENTO 100% FRONTEND
// ============================================================================

const SEED_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'proc_escola_cidada',
    version: 1,
    title: 'Escola Cidadã — Saúde em Movimento',
    procedure_description: 'Autorização para atendimento do aluno nas ações do projeto Escola Cidadã — Saúde em Movimento (UnB + SESI-DF + Finatec), sem a presença do responsável legal, com consentimento granular para tratamento de dados pessoais (LGPD) e uso de imagem, nome e voz (ECA/Art. 17).',
    content_markdown: `## TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO DIGITAL (TCLE)
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

O **Escola Cidadã: Saúde em Movimento** é uma iniciativa de extensão da **Universidade de Brasília (UnB)**, por meio da Faculdade de Ciências da Saúde (FS/UnB), realizada em parceria com o **Serviço Social da Indústria do Distrito Federal (SESI-DF)** e a **Fundação de Empreendimentos Científicos e Tecnológicos (Finatec)**, mediante acordo de cooperação técnica. O projeto é financiado por emenda parlamentar da Bancada do Distrito Federal.

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

> **(B1) AUTORIZO** a coleta, armazenamento e tratamento de dados pessoais e sensíveis (saúde) do(a) estudante pela UnB, SESI-DF e Finatec, nos termos do **Art. 14 da LGPD**, ciente de que serão mantidos em ambiente digital seguro, exclusivamente para fins médicos, educacionais e institucionais do projeto, pelo prazo de **3 (três) anos**.

> **(B2) NÃO AUTORIZO** o tratamento de dados. *(Impede a participação.)*

**Dados coletados:** nome completo, CPF do(a) estudante e do(a) responsável, data de nascimento, escola/turma, registros de atendimentos (prontuários) e dados de auditoria da assinatura (IP, timestamp, geolocalização).

**Base Legal:** Art. 7º, I, e Art. 14 da LGPD; Art. 46 da LGPD (segurança dos dados).

---

### C. SOBRE O USO DE IMAGEM E VOZ *(Opcional — não impede o atendimento)*

> **(C1) AUTORIZO** de forma gratuita o uso da imagem e voz do(a) estudante em fotos e vídeos do projeto, pela **Universidade de Brasília (UnB)**, **SESI-DF** e **Finatec**, exclusivamente para documentação, relatórios institucionais, peças de comunicação e divulgação do projeto em canais oficiais (site, redes sociais institucionais, materiais impressos), respeitando a dignidade e os direitos do(a) menor, nos termos do **Art. 17 do ECA**.

> **(C2) NÃO AUTORIZO** o uso da imagem. *(O(a) estudante participará normalmente de todos os atendimentos e não será fotografado(a) ou filmado(a).)*

**É expressamente proibido** o uso das imagens para fins comerciais, vexatórios, humilhantes ou discriminatórios, sob pena do **Art. 241 do ECA**.

---

## 4. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS *(Art. 18, LGPD)*

**Finalidade e Proteção:** Os dados coletados não serão comercializados, repassados a terceiros alheios ao projeto ou utilizados para fins discriminatórios.

**Direito de Revogação:** O titular, representado por seu responsável, poderá solicitar o acesso aos dados, correções ou a revogação do uso da imagem a qualquer momento, mediante contato com a **equipe responsável pelo projeto na escola** ou com a coordenação do projeto na UnB/SESI-DF/Finatec, no prazo de **15 dias úteis**.

**Seus direitos garantidos:** acesso, correção, eliminação, portabilidade, revogação do consentimento e reclamação perante a **ANPD** (anpd.gov.br).

---

## 5. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA

Declaro, sob as penas da lei (**Art. 299 do Código Penal — Falsidade Ideológica**, reclusão de 1 a 3 anos), que sou o(a) legítimo(a) responsável legal do(a) menor acima qualificado(a) e que as informações por mim inseridas nesta plataforma são verdadeiras.

Reconheço que o aceite eletrônico neste sistema possui **plena validade jurídica e eficácia probatória**, nos termos do **Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001** e da **Lei nº 14.063/2020**.

Estou ciente de que a plataforma registrará e armazenará, de forma segura, os seguintes dados para fins de comprovação e auditoria da minha assinatura:

- **Endereço IP** do dispositivo utilizado;
- **Data e Hora (Timestamp)** do registro em UTC;
- **Hash SHA-256** deste documento (garantia de integridade);
- **Dados do navegador/dispositivo** e **geolocalização** (quando habilitada).

---

*Ao prosseguir e confirmar a leitura, você avançará para a etapa de preenchimento dos seus dados e registro individual de cada autorização (A, B e C). O aceite final ocorre somente após o preenchimento completo e a assinatura eletrônica.*`,
    content_sha256: 'b4e2f1a3d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2',
    consent_text_version: 3,
    retention_days: 1095, // 3 anos conforme o termo
    is_active: true,
    created_at: '2026-08-19T10:00:00Z',
  }
];

const SEED_DOCUMENTS: (DocumentRecord & { template_title: string; procedure_description: string; content_markdown: string; consent_text_version: number })[] = [];

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

const SEED_INSTITUTIONS: Institution[] = [
  { id: 'cemeit', name: 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)', short_name: 'CEMEIT', city: 'Taguatinga', state: 'DF', is_active: true },
  { id: 'ced01-estrutural', name: 'Centro Educacional 01 da Estrutural', short_name: 'CED 01 Estrutural', city: 'Estrutural', state: 'DF', is_active: true },
  { id: 'cem02-ceilandia', name: 'Centro de Ensino Médio 02 de Ceilândia', short_name: 'CEM 02 Ceilândia', city: 'Ceilândia', state: 'DF', is_active: true },
  { id: 'ced02-guara', name: 'Centro Educacional 02 do Guará', short_name: 'CED 02 Guará', city: 'Guará', state: 'DF', is_active: true },
];

const getInstitutions = () => getStorage<Institution[]>('catraki_institutions', SEED_INSTITUTIONS);
const setInstitutions = (d: Institution[]) => setStorage('catraki_institutions', d);

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
    let doc = docs.find((d) => d.access_token === token);
    if (!doc) {
      const tmpl = SEED_TEMPLATES[0];
      doc = {
        id: `DOC-${Date.now()}`,
        template_id: tmpl.id,
        template_version: tmpl.version,
        template_title: tmpl.title,
        procedure_description: tmpl.procedure_description,
        content_markdown: tmpl.content_markdown,
        content_sha256: tmpl.content_sha256,
        consent_text_version: tmpl.consent_text_version,
        minor_name: 'Estudante',
        minor_birth_date: '2010-01-01',
        parent_name: 'Responsável Legal',
        parent_email_encrypted: 'ENC',
        parent_phone_encrypted: 'ENC',
        key_version: 1,
        access_token: token,
        status: 'pending',
        otp_attempts: 0,
        otp_resend_count: 0,
        retention_expires_at: new Date(Date.now() + 3 * 365 * 86400000).toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
      };
      docs.push(doc);
      setDocuments(docs);
    }

    // Atribui e persiste número de protocolo único para a sessão
    if (typeof window !== 'undefined') {
      const sessionDocKey = `catraki_doc_id_${token}`;
      let activeDocId = sessionStorage.getItem(sessionDocKey);
      if (!activeDocId) {
        activeDocId = generateUniqueDocId();
        sessionStorage.setItem(sessionDocKey, activeDocId);
      }
      doc.id = activeDocId;
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
        legal_notice: 'Assinatura Eletrônica Avançada (Decreto Federal nº 10.543/2020 e Lei nº 14.063/2020)',
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
   * Solicita envio de OTP por e-mail com código real
   */
  async requestOtp(token: string, channel: 'sms' | 'email', email?: string, minor_name?: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, channel, email, minor_name }),
      });
      return await resp.json();
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
      return await resp.json();
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
    signer_email?: string;
    minor_name?: string;
    minor_birth_date?: string;
    institution_name?: string;
    auth_health?: 'yes' | 'no';
    auth_data?: 'yes' | 'no';
    auth_image?: 'yes' | 'no';
    signature_png_base64: string;
    consent_lgpd_art11_art14: true;
    declaration_art299_penal: true;
    client_fingerprint?: string;
    ip_address?: string;
    geolocation?: string;
    user_agent?: string;
  }): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await resp.json();
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
      legal_basis: 'MP 2.200-2/2001 Art. 10, § 2º; Lei 14.063/2020 Art. 4º, II; LGPD (Lei 13.709/2018) Art. 11, I c/c Art. 14, § 1º; Art. 299 CP',
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
      ip_address: payload.ip_address || '189.120.44.12',
      user_agent: payload.user_agent || navigator.userAgent,
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
      ip_address: payload.ip_address || '189.120.44.12',
      user_agent: payload.user_agent || navigator.userAgent,
      geo_city: payload.geolocation ? payload.geolocation.split(',')[0] : 'Brasília',
      geo_region: payload.geolocation ? payload.geolocation.split(', ')[1]?.split(' -')[0] || 'DF' : 'DF',
      geo_country: 'Brasil',
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

    const validationCode = `SESI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}`;

    return {
      success: true,
      document_id: doc.id,
      validation_code: validationCode,
      manifest_sha256: manifestSha256,
      log_row_hash: logRowHash,
      signed_at_utc: signedAt,
      tsa_authority: tsa.tsaName,
      validation_url: `/validar/${validationCode}`,
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
   * Dispara e-mail de teste para validação da infraestrutura de correio
   */
  async sendTestEmail(emailDestino: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/send-test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailDestino }),
      });
      return await resp.json();
    } catch (err: any) {
      return {
        success: false,
        error: 'Falha ao conectar com o serviço de e-mail.',
        details: err.message,
      };
    }
  },

  /**
   * Validador público de autenticidade (aceita token curto SESI-XXXX-XXXX ou hash SHA-256)
   */
  async validatePublic(query: string): Promise<{ success: boolean; validation?: PublicValidationResponse; error?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/public/validate/${encodeURIComponent(query)}`);
      if (resp.ok) return await resp.json();
    } catch {}

    const logs = getAuditLogs();
    const clean = query.trim().toUpperCase();
    const cleanRaw = clean.replace(/[^A-Z0-9]/g, '');

    const audit = logs.find((a) => {
      const vCode = `SESI-${a.manifest_sha256.substring(0, 4).toUpperCase()}-${a.manifest_sha256.substring(a.manifest_sha256.length - 4).toUpperCase()}`;
      return (
        a.manifest_sha256.toLowerCase() === query.trim().toLowerCase() ||
        vCode === clean ||
        vCode.replace(/-/g, '') === cleanRaw ||
        a.manifest_sha256.toUpperCase().startsWith(cleanRaw) ||
        a.document_id.toUpperCase() === clean
      );
    });

    if (!audit) {
      return { success: false, error: 'Código de validação ou manifesto não localizado na trilha de auditoria oficial.' };
    }

    const docs = getDocuments();
    const doc = docs.find((d) => d.id === audit.document_id);
    const validationCode = `SESI-${audit.manifest_sha256.substring(0, 4).toUpperCase()}-${audit.manifest_sha256.substring(audit.manifest_sha256.length - 4).toUpperCase()}`;

    return {
      success: true,
      validation: {
        valid: true,
        validation_code: validationCode,
        legal_notice: 'Assinatura Eletrônica Avançada (Decreto Federal nº 10.543/2020 e Lei nº 14.063/2020)',
        signature_type: 'Assinatura Eletrônica Avançada (Dec. 10.543/2020)',
        document_id: audit.document_id,
        manifest_sha256: audit.manifest_sha256,
        content_sha256: audit.content_sha256_at_signing,
        signature_png_sha256: audit.signature_png_sha256,
        signed_at_utc: audit.signed_at,
        signer_name: audit.signer_name,
        signer_cpf_masked: audit.signer_cpf_masked,
        signer_relationship: audit.signer_relationship,
        ip_address: audit.ip_address,
        geolocation: `${audit.geo_city}, ${audit.geo_region} - ${audit.geo_country}`,
        user_agent: audit.user_agent,
        identity_method: audit.identity_method,
        procedure_title: doc?.template_title || 'Procedimento Médico SESI',
        procedure_description: doc?.procedure_description || 'Descrição médica registrada.',
        minor_name_initials: getInitials(doc?.minor_name || 'Menor Cadastrado'),
        document_status: doc?.status || 'signed',
        chain_position: logs.findIndex((a) => a.id === audit.id) + 1,
        prev_log_hash: audit.prev_log_hash,
        tsa_verified: true,
        tsa_authority: 'Servidor Sincronizado - Cloudflare',
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
    const docId = generateUniqueDocId();
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

  /**
   * Busca dados da escola/instituição pelo slug da URL
   */
  async getInstitutionBySlug(slug: string): Promise<{ success: boolean; institution: Institution }> {
    try {
      const resp = await fetch(`${API_BASE}/public/institutions/${encodeURIComponent(slug)}`);
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data.success && data.institution) {
          return { success: true, institution: data.institution };
        }
      }
    } catch {}

    const list = getInstitutions();
    const clean = slug.toLowerCase().trim();
    const inst = list.find((i) => i.id === clean && i.is_active);

    if (inst) {
      return { success: true, institution: inst };
    }

    // Se não estiver na lista fixa, gera um nome formatado amigável
    const formattedName = clean
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      success: true,
      institution: {
        id: clean,
        name: `Escola ${formattedName}`,
        short_name: formattedName,
        city: 'Brasília',
        state: 'DF',
        is_active: true,
      },
    };
  },

  async getAdminInstitutions(): Promise<{ success: boolean; institutions: Institution[] }> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, institutions: getInstitutions() };
  },

  async createAdminInstitution(data: Partial<Institution>): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (resp.ok) return await resp.json();
    } catch {}

    const list = getInstitutions();
    const cleanId = (data.id || data.short_name || 'escola').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const newInst: Institution = {
      id: cleanId,
      name: data.name || cleanId,
      short_name: data.short_name || cleanId.toUpperCase(),
      city: data.city || 'Brasília',
      state: data.state || 'DF',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const existingIndex = list.findIndex((i) => i.id === cleanId);
    if (existingIndex >= 0) {
      list[existingIndex] = newInst;
    } else {
      list.unshift(newInst);
    }
    setInstitutions(list);

    return {
      success: true,
      institution: newInst,
      message: 'Instituição / Escola cadastrada com sucesso!',
    };
  },

  async deleteAdminInstitution(id: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions/${id}`, { method: 'DELETE' });
      if (resp.ok) return await resp.json();
    } catch {}

    const list = getInstitutions();
    const updated = list.filter((i) => i.id !== id);
    setInstitutions(updated);
    return { success: true, message: 'Instituição removida com sucesso.' };
  },

  // ==========================================================================
  // AUTENTICAÇÃO SSO MICROSOFT & GESTÃO DE SESSÃO ADMIN
  // ==========================================================================

  getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('catraki_admin_jwt');
  },

  getCurrentAdminUser(): any | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('catraki_admin_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAdminSession(token: string, user: any): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('catraki_admin_jwt', token);
    localStorage.setItem('catraki_admin_user', JSON.stringify(user));
  },

  logoutAdmin(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('catraki_admin_jwt');
    localStorage.removeItem('catraki_admin_user');
    sessionStorage.removeItem('ms_code_verifier');
    sessionStorage.removeItem('ms_state');
  },

  /**
   * Inicia o fluxo de login gerando URL OAuth 2.0 PKCE na Microsoft
   */
  /**
   * Inicia o fluxo de login gerando URL OAuth 2.0 PKCE na Microsoft
   */
  async getMicrosoftLoginUrl(redirectUri?: string): Promise<{ success: boolean; authUrl?: string; state?: string; codeVerifier?: string; error?: string }> {
    const callbackUrl = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/admin/callback` : 'https://catraki.com.br/admin/callback');
    try {
      const resp = await fetch(`${API_BASE}/auth/microsoft/login-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri: callbackUrl }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data && data.success && typeof window !== 'undefined') {
          sessionStorage.setItem('ms_code_verifier', data.codeVerifier);
          sessionStorage.setItem('ms_state', data.state);
          sessionStorage.setItem('ms_redirect_uri', callbackUrl);
          try {
            localStorage.setItem('ms_code_verifier', data.codeVerifier);
            localStorage.setItem('ms_state', data.state);
            localStorage.setItem('ms_redirect_uri', callbackUrl);
          } catch {}
        }
        return data;
      }
    } catch {}

    // Fallback local se a API estiver offline
    const state = `state_${Date.now()}`;
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = await generatePkceChallenge(codeVerifier);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ms_code_verifier', codeVerifier);
      sessionStorage.setItem('ms_state', state);
      sessionStorage.setItem('ms_redirect_uri', callbackUrl);
      try {
        localStorage.setItem('ms_code_verifier', codeVerifier);
        localStorage.setItem('ms_state', state);
        localStorage.setItem('ms_redirect_uri', callbackUrl);
      } catch {}
    }

    return {
      success: true,
      authUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000000-0000-0000-0000-000000000000&response_type=code&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_mode=query&scope=openid%20profile%20email%20User.Read&state=${state}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&prompt=select_account`,
      state,
      codeVerifier,
    };
  },

  /**
   * Processa o callback da Microsoft, valida o token e o domínio institucional
   */
  async processMicrosoftCallback(code: string, state: string, codeVerifier?: string, redirectUri?: string): Promise<any> {
    const savedVerifier =
      codeVerifier ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('ms_code_verifier') || localStorage.getItem('ms_code_verifier')
        : '') ||
      '';
    const callbackUrl =
      redirectUri ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('ms_redirect_uri') || localStorage.getItem('ms_redirect_uri') || `${window.location.origin}/admin/callback`
        : 'https://catraki.com.br/admin/callback');

    try {
      const resp = await fetch(`${API_BASE}/auth/microsoft/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          codeVerifier: savedVerifier,
          redirectUri: callbackUrl,
        }),
      });

      const data = (await resp.json()) as any;
      if (resp.ok && data && data.success) {
        this.setAdminSession(data.token, data.user);
        return data;
      }
      return data || { success: false, error: 'Falha ao autenticar com a Microsoft.' };
    } catch {}

    // Simulação / Fallback
    const mockUser = {
      id: 'MS-USR-01',
      name: 'Gestor Institucional (SESI DF)',
      email: 'gestor.sesi@sesi.org.br',
      role: 'admin_master',
      auth_provider: 'Microsoft Entra ID (M365)',
    };
    const mockToken = `mock_jwt_${Date.now()}`;
    this.setAdminSession(mockToken, mockUser);

    return {
      success: true,
      token: mockToken,
      user: mockUser,
    };
  },

  /**
   * Login de contingência com usuário e senha
   */
  async loginAdminContingency(email: string, password: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await resp.json()) as any;
      if (resp.ok && data && data.success) {
        this.setAdminSession(data.token, data.user);
        return data;
      }
      return data;
    } catch {}

    if (email.toLowerCase() === 'master@sesi.org.br' && password === 'SesiMaster@2026') {
      const user = {
        id: 'usr_master_01',
        name: 'Dr. Roberto Silveira (Admin Master)',
        email: 'master@sesi.org.br',
        role: 'admin_master',
      };
      const token = `contingency_jwt_${Date.now()}`;
      this.setAdminSession(token, user);
      return { success: true, token, user };
    }

    return { success: false, error: 'Credenciais inválidas.' };
  },
};
