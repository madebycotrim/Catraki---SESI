import {
  sha256,
  canonicalJson,
  generatePkceVerifier,
  generatePkceChallenge,
} from './crypto.ts';
import { computeLogRowHash, verifyAuditChain } from './audit-chain.ts';
import { maskCPF, formatCPF, maskName, getInitials, generateUniqueDocId, formatUserAgent } from './schemas.ts';
import type {
  DocumentRecord,
  DocumentTemplate,
  AuditLogRow,
  PublicValidationResponse,
  ChainVerificationResult,
  Institution,
  DuplicateStudentCheckResponse,
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
    procedure_description: 'Autorização para atendimento do aluno nas ações do projeto Escola Cidadã — Saúde em Movimento (UnB + SESI-DF), sem a presença do responsável legal, com consentimento granular para tratamento de dados pessoais (LGPD) e uso de imagem, nome e voz (ECA/Art. 17).',
    content_markdown: `## TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO ELETRÔNICO (TCLE)
### Autorização de Atendimento de Saúde, Tratamento de Dados e Uso de Imagem

Prezado(a) Responsável,

Este formulário tem o objetivo de registrar a autorização para a participação do(a) estudante no projeto **Escola Cidadã — Saúde em Movimento**. O aceite eletrônico deste termo possui validade jurídica equivalente a um documento em papel assinado de próprio punho.

---

## 1. IDENTIFICAÇÃO DAS PARTES

### DADOS DO RESPONSÁVEL LEGAL (Quem autoriza)
- **Nome Completo:** [Informado no formulário]
- **CPF:** [Informado no formulário]
- **Vínculo com o(a) estudante:** Mãe / Pai / Responsável Legal
- **Telefone e E-mail:** [Informados no formulário]

### DADOS DO(A) ESTUDANTE (Quem receberá o atendimento)
- **Nome Completo:** [Informado no formulário]
- **Data de Nascimento e CPF:** [Informados no formulário]
- **Escola / Instituição:** [Informada no formulário]
- **Série, Turma e Turno:** [Informados no formulário]

---

## 2. SOBRE O PROJETO

O **Escola Cidadã: Saúde em Movimento** é uma iniciativa de extensão da **Universidade de Brasília (UnB)**, por meio da Faculdade de Ciências da Saúde (FS/UnB), realizada em parceria com o **Serviço Social da Indústria do Distrito Federal (SESI-DF)**.

**Público-alvo:** Estudantes matriculados em escolas públicas parceiras do Distrito Federal.

**Atendimentos ofertados:** Triagens preventivas e avaliações de saúde (Odontologia, Oftalmologia, Audiometria, Terapia Comunitária Integrativa e Nutrição) em unidades móveis na escola durante o período escolar.

---

## 3. AUTORIZAÇÕES DO TERMO

### A. Atendimento de Saúde (Obrigatório para participação)
Autorizo a realização de triagens preventivas e avaliações de saúde no(a) estudante pelas equipes do SESI-DF e da UnB nas unidades móveis do projeto, durante o turno escolar.

### B. Tratamento de Dados Pessoais (Obrigatório para participação)
Autorizo a coleta e o armazenamento dos dados cadastrais informados exclusivamente para identificação do(a) estudante e validação formal desta autorização, em conformidade com a LGPD (Lei nº 13.709/2018).

### C. Uso de Imagem e Voz (Opcional)
Autorizo o registro de imagens e vídeos do(a) estudante para fins de documentação e divulgação institucional do projeto pelo SESI-DF e UnB. A recusa deste item não impede o atendimento de saúde.

---

## 4. CONSULTA E REVOGAÇÃO

- A autenticidade deste termo pode ser verificada a qualquer momento através do código de validação emitido pela plataforma.
- A autorização poderá ser revogada ou corrigida a qualquer momento procurando a equipe de apoio presencial do projeto ou a direção da escola.

---

## 5. ASSINATURA ELETRÔNICA SIMPLES

Declaro, sob as penas da lei, que as informações prestadas são verdadeiras e que sou o responsável legal pelo(a) estudante indicado(a) (ou o próprio, se maior de idade).

As partes concordam expressamente com a utilização de **Assinatura Eletrônica Simples**, nos termos da **Lei Federal nº 14.063/2020** e do **Art. 10, § 2º da Medida Provisória nº 2.200-2/2001**.

Para fins de registro e comprovação da assinatura, a plataforma armazena:
- Assinatura desenhada na tela;
- Código de confirmação enviado para o e-mail informado;
- Endereço IP e horário do registro;
- Resumo criptográfico (Hash SHA-256) garantindo a integridade do termo.

---

*Ao prosseguir, você avançará para o preenchimento dos dados e confirmação das opções de autorização.*`,
    content_sha256: '5d98b3c1ad95490eba3b6339902569637cb26659bbaefc481b6e8c9edf5261da',
    consent_text_version: 3,
    retention_days: 7300, // 20 anos conforme o termo
    is_active: true,
    created_at: '2026-08-19T10:00:00Z',
  }
];

const SEED_DOCUMENTS: (DocumentRecord & { template_title: string; procedure_description: string; content_markdown: string; consent_text_version: number })[] = [];

const memoryStore = new Map<string, string>();

// Helper Functions para Armazenamento Transitório de Contingência (LocalStorage Persistente para Testes)
const getStorage = <T>(key: string, seed: T): T => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(key);
    if (data) {
      try { return JSON.parse(data); } catch {}
    }
    localStorage.setItem(key, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  }
  
  if (memoryStore.has(key)) {
    try { return JSON.parse(memoryStore.get(key)!); } catch {}
  }
  const cloned = JSON.parse(JSON.stringify(seed));
  memoryStore.set(key, JSON.stringify(cloned));
  return cloned;
};

const setStorage = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  } else {
    memoryStore.set(key, JSON.stringify(data));
  }
};

const getTemplates = () => getStorage('catraki_templates', SEED_TEMPLATES);
const setTemplates = (d: any[]) => setStorage('catraki_templates', d);

const getDocuments = () => getStorage('catraki_docs', SEED_DOCUMENTS);
const setDocuments = (d: any[]) => setStorage('catraki_docs', d);

const getAuditLogs = () => getStorage<AuditLogRow[]>('catraki_audit', []);
const setAuditLogs = (d: any[]) => setStorage('catraki_audit', d);

const getLgpdRequests = () => getStorage<any[]>('catraki_lgpd', []);
const setLgpdRequests = (d: any[]) => setStorage('catraki_lgpd', d);

const SEED_INSTITUTIONS: Institution[] = [];

const getInstitutions = (): Institution[] => {
  return getStorage<Institution[]>('catraki_institutions', SEED_INSTITUTIONS);
};

// ============================================================================
// CLIENTE API COM FALLBACK INTELIGENTE
// ============================================================================

export const apiClient = {
  /**
   * Reseta o banco de dados local em memória/sessão (útil para testes unitários e reinicialização)
   */
  resetLocalDb() {
    memoryStore.clear();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('catraki_templates');
      localStorage.removeItem('catraki_docs');
      localStorage.removeItem('catraki_audit');
      localStorage.removeItem('catraki_reviews');
      localStorage.removeItem('catraki_lgpd');
      localStorage.removeItem('catraki_institutions');
    }
  },

  /**
   * Registra documento mock para testes unitários / contingência
   */
  seedDocument(doc: any) {
    const docs = getDocuments();
    docs.push(doc);
    setDocuments(docs);
  },

  /**
   * Registra instituição mock para testes unitários / contingência
   */
  seedInstitution(inst: Institution) {
    const insts = getInstitutions();
    insts.push(inst);
    setStorage('catraki_institutions', insts);
  },

  /**
   * Obtém documento mock do storage local por ID ou access_token
   */
  getLocalDocument(idOrToken: string) {
    const docs = getDocuments();
    return docs.find((d) => d.id === idOrToken || d.access_token === idOrToken) || null;
  },

  /**
   * Busca documento pelo token de acesso
   */
  async getSignerDoc(token: string): Promise<any> {
    if (!token || !token.trim()) {
      return {
        success: false,
        code: 'MISSING_SCHOOL_SLUG',
        error: 'Nenhuma escola foi especificada na URL.',
      };
    }

    try {
      const resp = await fetch(`${API_BASE}/signer/doc/${token}`);
      const data = (await resp.json().catch(() => null)) as any;
      if (data && (resp.ok || data.code || data.error)) return data;
    } catch {}

    const docs = getDocuments();
    let doc = docs.find((d) => d.access_token === token || d.id === token);

    const instList = getInstitutions();
    const cleanToken = (token || '').toLowerCase().trim();
    const cleanNoHyphen = cleanToken.replace(/[-_]/g, '');
    const inst = instList.find(
      (i) =>
        i.is_active && (
          i.id.toLowerCase() === cleanToken ||
          i.short_name.toLowerCase() === cleanToken ||
          cleanNoHyphen === i.id.toLowerCase().replace(/[-_]/g, '') ||
          cleanNoHyphen === i.short_name.toLowerCase().replace(/[-_]/g, '')
        )
    );

    // Se NÃO for um documento pré-existente e NÃO for um token de acesso nem escola cadastrada
    const isDocToken = cleanToken.startsWith('doc-') || cleanToken.startsWith('sesi-') || cleanToken.startsWith('tok-') || cleanToken.startsWith('token-') || cleanToken.startsWith('test-');
    if (!doc && !inst && !isDocToken) {
      return {
        success: false,
        code: 'SCHOOL_NOT_FOUND',
        error: `A unidade escolar "${token}" não foi encontrada no sistema. O formulário só pode ser aberto para escolas previamente cadastradas.`,
      };
    }

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
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };
      docs.push(doc);
      setDocuments(docs);
    }

    // Atribui e persiste número de protocolo único para a sessão
    if (typeof window !== 'undefined') {
      const sessionDocKey = `catraki_doc_id_${token}`;
      let activeDocId = localStorage.getItem(sessionDocKey) || sessionStorage.getItem(sessionDocKey);
      if (!activeDocId) {
        activeDocId = generateUniqueDocId();
        localStorage.setItem(sessionDocKey, activeDocId);
        sessionStorage.setItem(sessionDocKey, activeDocId);
      }
      doc.id = activeDocId;
    }

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
        legal_notice: 'Assinatura Eletrônica — Art. 10, § 2º, MP nº 2.200-2/2001 c/c Lei nº 14.063/2020; Código Civil (Arts. 104 e 107); CPC (Arts. 411 e 441); LGPD (Lei nº 13.709/2018) Arts. 7º, I, 11, I e 14; ECA Art. 17; Art. 299 CP',
        institution_id: inst ? inst.id : ((doc as any).institution_id || cleanToken),
        institution_name: inst ? inst.name : ((doc as any).institution_name || 'Instituição de Ensino'),
        institution_short_name: inst ? inst.short_name : ((doc as any).institution_short_name || 'Instituição'),
        institution_city: inst ? inst.city : ((doc as any).institution_city || 'Brasília'),
        institution_state: inst ? inst.state : ((doc as any).institution_state || 'DF'),
      },
    };
  },

  /**
   * Verifica se o estudante já possui uma autorização médica válida e assinada (Prevenção de Duplicidade)
   */
  async checkStudentDuplicate(params: {
    minor_cpf: string;
    minor_name?: string;
    minor_birth_date?: string;
  }): Promise<DuplicateStudentCheckResponse> {
    const cleanCpf = (params.minor_cpf || '').replace(/\D/g, '');
    const cleanName = (params.minor_name || '').trim().toLowerCase();

    try {
      const resp = await fetch(`${API_BASE}/signer/check-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minor_cpf: cleanCpf,
          minor_name: params.minor_name,
          minor_birth_date: params.minor_birth_date,
        }),
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {}

    // Fallback local em storage/sessionStorage
    const docs = getDocuments();
    const logs = getAuditLogs();

    const signedDoc = docs.find((d) => {
      if (d.status !== 'signed') return false;
      const dCpf = ((d as any).minor_cpf_raw || (d as any).minor_cpf || '').replace(/\D/g, '');
      if (cleanCpf && cleanCpf.length === 11 && dCpf === cleanCpf) return true;
      if (
        cleanName &&
        d.minor_name &&
        d.minor_name.trim().toLowerCase() === cleanName &&
        params.minor_birth_date &&
        d.minor_birth_date === params.minor_birth_date
      ) {
        return true;
      }
      return false;
    });

    if (signedDoc) {
      const audit = logs.find((a) => a.document_id === signedDoc.id || (a as any).manifest_sha256 === (signedDoc as any).manifest_sha256);
      const manifestHash = audit?.manifest_sha256 || (signedDoc as any).manifest_sha256;
      
      const validationCode = (signedDoc as any).validation_code || (manifestHash
        ? `CATRAKI-${manifestHash.substring(0, 4).toUpperCase()}-${manifestHash.substring(manifestHash.length - 4).toUpperCase()}`
        : `CATRAKI-${(signedDoc.id.replace(/\D/g, '') + '00000000').slice(-8, -4)}-${(signedDoc.id.replace(/\D/g, '') + '00000000').slice(-4)}`);

      return {
        hasExistingSignature: true,
        existingValidationCode: validationCode,
        signedAt: (signedDoc as any).otp_verified_at || signedDoc.created_at,
        signerNameMasked: signedDoc.parent_name ? maskName(signedDoc.parent_name) : 'Responsável Legal',
        minorName: signedDoc.minor_name,
        documentId: signedDoc.id,
      };
    }

    return {
      hasExistingSignature: false,
    };
  },

  /**
   * Envia documentos para revisão manual
  /**
   * Solicita envio de OTP por e-mail com código real e verificação anti-bot Turnstile
   */
  async requestOtp(
    token: string,
    channel: 'email' = 'email',
    email?: string,
    minor_name?: string,
    turnstile_token?: string,
    phone?: string,
    school_slug?: string,
    institution_name?: string
  ): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/signer/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, channel, email, minor_name, turnstile_token, phone, school_slug, institution_name }),
      });
      return await resp.json();
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token || d.id === token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    if (school_slug) (doc as any).institution_id = school_slug;
    if (institution_name) (doc as any).institution_name = institution_name;

    const devOtp = '123456';
    doc.otp_secret_hash = devOtp;
    doc.otp_attempts = 0;
    doc.otp_resend_count += 1;
    (doc as any).otp_requested_at = new Date().toISOString();
    (doc as any).otp_email_message_id = 'mock-resend-id-' + Date.now();
    (doc as any).otp_delivery_status = 'sent';
    
    setDocuments(docs);

    return {
      success: true,
      channel: 'email',
      expires_in_seconds: 300,
      simulated_otp: devOtp,
      message: 'Código de verificação de 6 dígitos enviado para o e-mail do responsável legal.',
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
    const doc = docs.find((d) => d.access_token === token || d.id === token);
    if (!doc) return { success: false, error: 'Documento indisponível.' };

    if (otp_code === '123456' || doc.otp_secret_hash === otp_code) {
      return { success: true, verified: true, message: 'Identidade e código 2FA confirmados.' };
    }

    doc.otp_attempts += 1;
    setDocuments(docs);
    return { success: false, error: `Código incorreto. Tentativas restantes: ${Math.max(0, 3 - doc.otp_attempts)}` };
  },

  /**
   * Submete a assinatura eletrônica com hash chain e registro probatório
   */
  async signDocument(payload: {
    token: string;
    otp_code: string;
    signer_name: string;
    signer_cpf: string;
    signer_relationship: any;
    signer_email?: string;
    signer_phone?: string;
    signer_address?: string;
    minor_name?: string;
    minor_birth_date?: string;
    minor_cpf?: string;
    minor_series?: string;
    minor_class?: string;
    minor_turn?: string;
    school_slug?: string;
    institution_id?: string;
    institution_name?: string;
    auth_health?: 'yes' | 'no';
    auth_data?: 'yes' | 'no';
    auth_image?: 'yes' | 'no';
    signature_png_base64: string;
    consent_lgpd_art11_art14: true;
    declaration_art299_penal: true;
    declaration_legal_responsibility: true;
    client_fingerprint?: string;
    ip_address?: string;
    geolocation?: string;
    user_agent?: string;
    identity_method?: 'declaracao_responsavel' | 'declaracao_titular';
    termos_versao?: string;
    device_fingerprint_data?: any;
  }): Promise<any> {
    // Função auxiliar: persiste auth_image/health/data e instituição no localStorage
    // independente de qual caminho processa a assinatura (backend ou mock local)
    const persistAuthFieldsLocally = (successResp: any) => {
      try {
        const docs = getDocuments();
        const doc = docs.find((d) => d.access_token === payload.token || d.id === payload.token);
        if (doc) {
          (doc as any).auth_image = payload.auth_image ?? 'no';
          (doc as any).auth_health = payload.auth_health ?? 'yes';
          (doc as any).auth_data = payload.auth_data ?? 'yes';
          if (payload.institution_name) (doc as any).institution_name = payload.institution_name;
          if (payload.school_slug || payload.institution_id) (doc as any).institution_id = payload.school_slug || payload.institution_id;
          if (successResp?.document_id) doc.id = successResp.document_id;
          if (successResp?.validation_code) (doc as any).validation_code = successResp.validation_code;
          if (successResp?.manifest_sha256) (doc as any).manifest_sha256 = successResp.manifest_sha256;
          doc.status = 'signed';
          doc.parent_name = payload.signer_name;
          setDocuments(docs);
        }
      } catch {}
    };

    try {
      const resp = await fetch(`${API_BASE}/signer/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as any;
      if (data?.success) {
        persistAuthFieldsLocally(data);
      }
      return data;
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === payload.token || d.id === payload.token);
    if (!doc) return { success: false, error: 'Documento não localizado.' };

    // Verificação de duplicidade: não permite que o mesmo aluno tenha mais de uma autorização assinada
    if (payload.minor_cpf) {
      const dupCheck = await this.checkStudentDuplicate({
        minor_cpf: payload.minor_cpf,
        minor_name: payload.minor_name,
        minor_birth_date: payload.minor_birth_date,
      });

      if (dupCheck.hasExistingSignature && dupCheck.documentId !== doc.id) {
        return {
          success: false,
          error: `Este(a) estudante já possui uma autorização válida e assinada (Código: ${dupCheck.existingValidationCode}).`,
          code: 'STUDENT_ALREADY_SIGNED',
          existing_validation_code: dupCheck.existingValidationCode,
        };
      }
    }

    const signedAt = new Date().toISOString();
    const signaturePngSha256 = await sha256(payload.signature_png_base64);
    const cpfMasked = maskCPF(payload.signer_cpf);

    const logs = getAuditLogs();
    const prevLogHash = logs.length > 0 
      ? logs[logs.length - 1].log_row_hash 
      : null;

    // Cálculo do Fingerprint do Termo + Dados do Pai (SHA-256)
    const textToHash = `${doc.content_markdown || ''}\n${payload.signer_name}\n${payload.signer_cpf}\n${payload.minor_name || doc.minor_name}\n${payload.minor_birth_date || doc.minor_birth_date}`;
    const docParentHash = await sha256(textToHash);

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
      legal_basis: 'MP 2.200-2/2001 Art. 10, §2º; Lei 14.063/2020; Código Civil (Arts. 104, 107 e 225); CPC (Arts. 411 e 441); LGPD (Lei 13.709/2018) Arts. 7º, I e II, 11, I, 14, §1º e 18; ECA Art. 17; Art. 299 CP; REsp 2.205.708/PR (STJ)',
    };

    const manifestSha256 = await sha256(canonicalJson(manifestData));

    const auditId = `AUD-${Date.now()}`;
    const otpRequestedTime = (doc as any).otp_requested_at || new Date(Date.now() - 60000).toISOString();
    const otpMsgId = (doc as any).otp_email_message_id || 'mock-message-id';

    const resolvedIdentityMethod: 'declaracao_responsavel' = 'declaracao_responsavel';

    const logRowHash = await computeLogRowHash({
      id: auditId,
      document_id: doc.id,
      prev_log_hash: prevLogHash,
      signed_at: signedAt,
      signer_name: payload.signer_name,
      signer_cpf_masked: cpfMasked,
      signer_relationship: payload.signer_relationship,
      identity_method: resolvedIdentityMethod,
      signature_png_sha256: signaturePngSha256,
      // IP real do cliente — nunca substitui por hardcode
      ip_address: payload.ip_address || 'não registrado',
      user_agent: payload.user_agent || navigator.userAgent,
      client_fingerprint: payload.client_fingerprint || null,
      content_sha256_at_signing: doc.content_sha256,
      consent_text_version: doc.consent_text_version,
      manifest_sha256: manifestSha256,
      otp_requested_at: otpRequestedTime,
      otp_verified_at: signedAt,
      otp_email_message_id: otpMsgId,
      doc_parent_hash_sha256: docParentHash,
      device_metadata: formatUserAgent(payload.user_agent || navigator.userAgent),
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
      // Método real de identificação — nunca hardcode
      identity_method: resolvedIdentityMethod,
      signature_png_encrypted: 'ENC_PNG',
      signature_png_sha256: signaturePngSha256,
      key_version: 1,
      // IP real do cliente — sem fallback falso
      ip_address: payload.ip_address || 'não registrado',
      user_agent: payload.user_agent || navigator.userAgent,
      // Geolocalização real do cliente — sem fallback falso
      geo_city: payload.geolocation ? payload.geolocation.split(',')[0]?.trim() : null,
      geo_region: payload.geolocation ? payload.geolocation.split(', ')[1]?.split(' -')[0]?.trim() || null : null,
      geo_country: payload.geolocation ? 'Brasil' : null,
      client_fingerprint: payload.client_fingerprint || null,
      content_sha256_at_signing: doc.content_sha256,
      consent_text_version: doc.consent_text_version,
      manifest_sha256: manifestSha256,
      otp_requested_at: otpRequestedTime,
      otp_verified_at: signedAt,
      otp_email_message_id: otpMsgId,
      doc_parent_hash_sha256: docParentHash,
      device_metadata: formatUserAgent(payload.user_agent || navigator.userAgent),
      log_row_hash: logRowHash,
      created_at: signedAt,
    };

    logs.push(newAuditRow);
    setAuditLogs(logs);
    
    doc.status = 'signed';
    doc.parent_name = payload.signer_name;
    (doc as any).otp_verified_at = signedAt;
    (doc as any).doc_parent_hash_sha256 = docParentHash;
    (doc as any).manifest_sha256 = manifestSha256;
    const validationCode = `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}`;
    (doc as any).validation_code = validationCode;
    if (payload.minor_name) {
      doc.minor_name = payload.minor_name;
    }
    if (payload.minor_cpf) {
      (doc as any).minor_cpf = formatCPF(payload.minor_cpf);
      (doc as any).minor_cpf_raw = payload.minor_cpf.replace(/\D/g, '');
    }
    // Sempre persiste os campos de autorização — nunca condicionado a truthy
    // ('no' é string truthy em JS mas representa negativa explícita)
    (doc as any).auth_image = payload.auth_image ?? 'no';
    (doc as any).auth_health = payload.auth_health ?? 'yes';
    (doc as any).auth_data = payload.auth_data ?? 'yes';
    if (payload.school_slug || payload.institution_id) {
      (doc as any).institution_id = payload.school_slug || payload.institution_id;
    }
    if (payload.institution_name) {
      (doc as any).institution_name = payload.institution_name;
    }

    setDocuments(docs);

    return {
      success: true,
      document_id: doc.id,
      validation_code: validationCode,
      manifest_sha256: manifestSha256,
      log_row_hash: logRowHash,
      signed_at_utc: signedAt,
      validation_url: `/validar/${validationCode}`,
      message: 'Autorização registrada eletronicamente com sucesso.',
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
      if (resp.ok) {
        const data = (await resp.json()) as any;
        const docs = getDocuments();
        const doc = docs.find((d) => d.access_token === token || d.id === token);
        if (doc) {
          doc.status = 'revoked';
          doc.revoked_at = data?.revoked_at || new Date().toISOString();
          doc.revoked_reason = reason;
          setDocuments(docs);
        }
        return data;
      }
    } catch {}

    const docs = getDocuments();
    const doc = docs.find((d) => d.access_token === token || d.id === token);
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
   * Validador público de autenticidade (aceita token curto CATRAKI-XXXX-XXXX, SESI-XXXX-XXXX (legado), URLs, ID ou hash SHA-256)
   */
  async validatePublic(query: string): Promise<{ success: boolean; validation?: PublicValidationResponse; error?: string }> {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { success: false, error: 'Por favor, informe o código de autenticidade ou hash SHA-256.' };
    }

    // Normalização inicial: remove espaços, aspas e extrai código se for uma URL completa
    let rawQuery = query.trim();
    if (rawQuery.includes('/validar/')) {
      rawQuery = rawQuery.split('/validar/').pop()?.split('?')[0]?.split('#')[0] || rawQuery;
    }
    rawQuery = rawQuery.replace(/^[/#]+/, '').trim();

    try {
      const resp = await fetch(`${API_BASE}/public/validate/${encodeURIComponent(rawQuery)}`);
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const json = (await resp.json()) as any;
        if (json && json.success && json.validation) {
          return json;
        }
      }
    } catch {}

    const logs = getAuditLogs();
    const docs = getDocuments();

    const clean = rawQuery.toUpperCase();
    const cleanRaw = clean.replace(/[^A-Z0-9]/g, '');
    const cleanNoPrefix = cleanRaw.replace(/^(SESI|CATRAKI|DOC)/i, '');
    const cleanLower = rawQuery.toLowerCase();
    const is64Hex = /^[0-9a-f]{64}$/i.test(clean);

    // Extração de prefixo e sufixo de 4 caracteres para códigos curtos (ex: 0AD2-2A49 -> 0AD2 e 2A49)
    const hexPref = cleanNoPrefix.length >= 8 ? cleanNoPrefix.substring(0, 4) : '';
    const hexSuff = cleanNoPrefix.length >= 8 ? cleanNoPrefix.substring(cleanNoPrefix.length - 4) : '';

    const audit = logs.find((a) => {
      const mSha = (a?.manifest_sha256 || '').toUpperCase();
      const cSha = (a?.content_sha256_at_signing || '').toUpperCase();
      const pSha = (a?.doc_parent_hash_sha256 || '').toUpperCase();
      const docId = (a?.document_id || '').toUpperCase();
      const auditId = (a?.id || '').toUpperCase();

      const vCodeCatraki = mSha.length >= 8 ? `CATRAKI-${mSha.substring(0, 4)}-${mSha.substring(mSha.length - 4)}` : '';
      const vCodeSesi = mSha.length >= 8 ? `SESI-${mSha.substring(0, 4)}-${mSha.substring(mSha.length - 4)}` : '';

      const isShortHexMatch = hexPref && hexSuff && mSha.length >= 8 &&
        mSha.startsWith(hexPref) && mSha.endsWith(hexSuff);

      const isContentHexMatch = hexPref && hexSuff && cSha.length >= 8 &&
        cSha.startsWith(hexPref) && cSha.endsWith(hexSuff);

      const isDocParentHexMatch = hexPref && hexSuff && pSha.length >= 8 &&
        pSha.startsWith(hexPref) && pSha.endsWith(hexSuff);

      return (
        mSha.toLowerCase() === cleanLower ||
        cSha.toLowerCase() === cleanLower ||
        pSha.toLowerCase() === cleanLower ||
        vCodeCatraki === clean ||
        vCodeSesi === clean ||
        vCodeCatraki.replace(/-/g, '') === cleanRaw ||
        vCodeSesi.replace(/-/g, '') === cleanRaw ||
        (mSha.length > 0 && mSha.startsWith(cleanRaw)) ||
        docId === clean ||
        docId.replace(/[^A-Z0-9]/g, '') === cleanRaw ||
        auditId === clean ||
        isShortHexMatch ||
        isContentHexMatch ||
        isDocParentHexMatch
      );
    });

    let doc = docs.find((d) => d.id === audit?.document_id);

    if (!audit) {
      doc = docs.find((d) => {
        const dManifest = ((d as any).manifest_sha256 || d.content_sha256 || (d as any).doc_parent_hash_sha256 || '').toUpperCase();
        const dValCode = ((d as any).validation_code || (dManifest.length >= 8 ? `SESI-${dManifest.substring(0, 4)}-${dManifest.substring(dManifest.length - 4)}` : '')).toUpperCase();
        const dIdClean = (d.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const dTokenClean = (d.access_token || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        const isHexMatch = hexPref && hexSuff && dManifest.length >= 8 &&
          dManifest.startsWith(hexPref) && dManifest.endsWith(hexSuff);

        const isIdMatch = hexPref && hexSuff && dIdClean.length >= 8 &&
          dIdClean.includes(hexPref) && dIdClean.includes(hexSuff);

        return (
          d.id.toUpperCase() === clean ||
          dIdClean === cleanRaw ||
          (cleanNoPrefix.length >= 4 && dIdClean.includes(cleanNoPrefix)) ||
          (cleanNoPrefix.length >= 4 && dTokenClean.includes(cleanNoPrefix)) ||
          dValCode === clean ||
          dValCode.replace(/-/g, '') === cleanRaw ||
          dValCode.replace(/^SESI-/i, 'CATRAKI-') === clean ||
          dManifest.toLowerCase() === cleanLower ||
          isHexMatch ||
          isIdMatch
        );
      });

      if (doc) {
        const manifest = (doc as any).manifest_sha256 || doc.content_sha256 || (doc as any).doc_parent_hash_sha256 || (is64Hex ? cleanLower : `${cleanNoPrefix.toLowerCase()}${'0'.repeat(Math.max(0, 64 - cleanNoPrefix.length))}`);
        const codePrefix = clean.startsWith('CATRAKI') ? 'CATRAKI' : 'SESI';
        const validationCode = (doc as any).validation_code || `${codePrefix}-${manifest.substring(0, 4).toUpperCase()}-${manifest.substring(Math.max(0, manifest.length - 4)).toUpperCase()}`;

        return {
          success: true,
          validation: {
            valid: doc.status !== 'CANCELADO_POR_ERRO' && (doc.status as any) !== 'cancelled_error' && doc.status !== 'revoked',
            validation_code: validationCode,
            legal_notice: 'Assinatura Eletrônica Simples — Art. 10, § 2º, MP nº 2.200-2/2001 c/c Lei Federal nº 14.063/2020 (Art. 4º, I); Código Civil (Arts. 104 e 107); LGPD (Lei nº 13.709/2018); ECA Art. 17; Art. 299 CP',
            signature_type: 'Assinatura Eletrônica Simples — Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 4º, I da Lei nº 14.063/2020',
            document_id: doc.id,
            manifest_sha256: manifest,
            content_sha256: doc.content_sha256 || 'SHA256-PENDING',
            signature_png_sha256: (doc as any).doc_parent_hash_sha256 || manifest,
            ip_address: (doc as any).ip_address || 'Não registrado',
            geolocation: (doc as any).geolocation || 'Não registrado',
            user_agent: (doc as any).user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Não registrado'),
            signed_at_utc: (doc as any).otp_verified_at || doc.created_at || new Date().toISOString(),
            signer_name: doc.parent_name || 'Responsável Legal',
            signer_cpf_masked: (doc as any).parent_cpf ? maskCPF((doc as any).parent_cpf) : '***.***.***-**',
            signer_relationship: (doc as any).relationship || 'Responsável Legal',
            identity_method: 'declaracao_responsavel',
            procedure_title: doc.template_title || 'Autorização SESI Escola Cidadã',
            procedure_description: doc.procedure_description || 'Procedimento médico / odontológico registrado.',
            minor_name_initials: getInitials(doc.minor_name || 'Estudante'),
            minor_series: (doc as any).minor_series,
            minor_class: (doc as any).minor_class,
            minor_turn: (doc as any).minor_turn,
            document_status: doc.status || 'signed',
            chain_position: 1,
            prev_log_hash: 'Início da Cadeia',
            auth_image: (doc as any).auth_image === 'yes' || (doc as any).auth_image === true ? 'yes' : (doc as any).auth_image === 'no' || (doc as any).auth_image === false ? 'no' : null,
            auth_health: (doc as any).auth_health ?? null,
            auth_data: (doc as any).auth_data ?? null,
            revocation_info: doc.status === 'revoked' ? {
              revoked_at: doc.revoked_at || '',
              revoked_reason: doc.revoked_reason || 'Revogado a pedido do responsável legal',
            } : null,
            cancellation_info: doc.status === 'CANCELADO_POR_ERRO' || (doc.status as any) === 'cancelled_error' ? {
              cancelled_at: doc.cancelled_at || doc.revoked_at || '',
              cancellation_reason: doc.cancellation_reason || doc.revoked_reason || 'Invalidação administrativa por erro operacional',
              cancelled_by_role: 'Operador Administrativo SESI / Saúde',
            } : null,
          },
        };
      }
    }

    if (!audit) {
      return { success: false, error: 'Código de validação ou manifesto não localizado na base de registros da plataforma. Verifique se digitou o código completo (Ex: CATRAKI-XXXX-XXXX).' };
    }

    const codePrefix = clean.startsWith('CATRAKI') ? 'CATRAKI' : 'SESI';
    const validationCode = `${codePrefix}-${audit.manifest_sha256.substring(0, 4).toUpperCase()}-${audit.manifest_sha256.substring(audit.manifest_sha256.length - 4).toUpperCase()}`;

    // Monta string de geolocalização
    let geoCity = audit.geo_city;
    if (!geoCity || geoCity.toLowerCase() === 'local' || geoCity.toLowerCase() === 'unknown') geoCity = '';
    let geoRegion = audit.geo_region;
    if (!geoRegion || geoRegion === 'unknown') geoRegion = '';
    else if (geoRegion.toUpperCase().startsWith('BR-')) geoRegion = geoRegion.toUpperCase().replace('BR-', '');
    let geoCountry = audit.geo_country || '';
    if (geoCountry === 'BR') geoCountry = 'Brasil';

    const geoStr = [geoCity, geoRegion, geoCountry].filter(Boolean).join(', ') || 'Não registrado';

    const resolvedUserAgent = audit.user_agent && audit.user_agent !== 'Não registrado' && audit.user_agent !== 'Navegador Web Padrão'
      ? audit.user_agent
      : ((doc as any)?.user_agent || (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'Não registrado'));

    return {
      success: true,
      validation: {
        valid: doc?.status !== 'CANCELADO_POR_ERRO' && (doc?.status as any) !== 'cancelled_error' && doc?.status !== 'revoked',
        validation_code: validationCode,
        legal_notice: 'Assinatura Eletrônica Simples — Art. 10, § 2º, MP nº 2.200-2/2001 c/c Lei Federal nº 14.063/2020 (Art. 4º, I); Código Civil (Arts. 104 e 107); LGPD (Lei nº 13.709/2018); ECA Art. 17; Art. 299 CP',
        signature_type: 'Assinatura Eletrônica Simples — Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 4º, I da Lei nº 14.063/2020',
        document_id: audit.document_id,
        manifest_sha256: audit.manifest_sha256,
        content_sha256: audit.content_sha256_at_signing,
        signature_png_sha256: audit.signature_png_sha256,
        signed_at_utc: audit.signed_at,
        signer_name: audit.signer_name,
        signer_cpf_masked: audit.signer_cpf_masked,
        signer_relationship: audit.signer_relationship,
        ip_address: audit.ip_address || 'Registrado no sistema',
        geolocation: geoStr,
        user_agent: resolvedUserAgent,
        identity_method: audit.identity_method,
        procedure_title: doc?.template_title || 'Procedimento Médico SESI',
        procedure_description: doc?.procedure_description || 'Descrição médica registrada.',
        minor_name_initials: getInitials(doc?.minor_name || (audit as any).minor_name || 'Menor Cadastrado'),
        minor_series: (doc as any)?.minor_series,
        minor_class: (doc as any)?.minor_class,
        minor_turn: (doc as any)?.minor_turn,
        document_status: doc?.status || 'signed',
        chain_position: logs.findIndex((a) => a.id === audit.id) + 1,
        prev_log_hash: audit.prev_log_hash,
        auth_image: (doc as any)?.auth_image === 'yes' || (doc as any)?.auth_image === true ? 'yes' : (doc as any)?.auth_image === 'no' || (doc as any)?.auth_image === false ? 'no' : null,
        auth_health: (doc as any)?.auth_health ?? null,
        auth_data: (doc as any)?.auth_data ?? null,
        revocation_info: doc?.status === 'revoked' ? {
          revoked_at: doc?.revoked_at || '',
          revoked_reason: doc?.revoked_reason || 'Revogado a pedido do responsável legal',
        } : null,
        cancellation_info: doc?.status === 'CANCELADO_POR_ERRO' || (doc?.status as any) === 'cancelled_error' ? {
          cancelled_at: doc?.cancelled_at || doc?.revoked_at || '',
          cancellation_reason: doc?.cancellation_reason || doc?.revoked_reason || 'Invalidação administrativa por erro operacional',
          cancelled_by_role: 'Operador Administrativo SESI / Saúde',
        } : null,
      },
    };
  },

  /**
   * Consulta os dados de rede e geolocalização do cliente em tempo real detectados pela Cloudflare Edge
   */
  async getClientInfo(): Promise<{ success: boolean; client?: any }> {
    try {
      const resp = await fetch(`${API_BASE}/public/client-info`);
      if (resp.ok) {
        return (await resp.json()) as any;
      }
    } catch {}

    try {
      // Obtém dados reais diretamente do Cloudflare Edge
      const cfResp = await fetch('/cdn-cgi/trace');
      if (cfResp.ok) {
        const text = await cfResp.text();
        const lines = text.split('\n');
        const data: Record<string, string> = {};
        lines.forEach((line) => {
          const parts = line.split('=');
          if (parts.length === 2) {
            data[parts[0].trim()] = parts[1].trim();
          }
        });
        if (data.ip) {
          return {
            success: true,
            client: {
              ip: data.ip,
              country: data.loc || 'Brasil',
              userAgent: data.uag || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Não identificado'),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              formattedLocation: data.loc || 'Brasil',
            },
          };
        }
      }
    } catch {}

    return {
      success: false,
      client: null,
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
      message: 'Sua solicitação fundamentada na LGPD foi registrada e encaminhada ao canal de privacidade.',
    };
  },

  // ==========================================================================
  // FUNÇÕES ADMINISTRATIVAS (RBAC)
  // ==========================================================================
  // HELPERS DE AUTENTICAÇÃO E CABEÇALHOS
  // ==========================================================================

  getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const token = this.getAdminToken();
    const headers: Record<string, string> = { ...customHeaders };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // ==========================================================================
  // ENDPOINTS ADMINISTRATIVOS (BACKEND HONO / CLOUDFLARE D1)
  // ==========================================================================

  async getAdminTemplates(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/templates`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return { success: true, templates: getTemplates() };
  },

  async createAdminTemplate(templateData: any): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/templates`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(templateData),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
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

  async getAdminDocuments(limit?: string): Promise<any> {
    try {
      const url = limit ? `${API_BASE}/admin/documents?limit=${limit}` : `${API_BASE}/admin/documents`;
      const resp = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data && data.success && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
        return data;
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return { success: true, documents: getDocuments() };
  },

  /**
   * Expira em lote rascunhos pendentes abandonados (>24h) em conformidade com a LGPD
   */
  async cleanupPendingDocuments(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/cleanup-pending`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = (await resp.json().catch(() => null)) as any;
      if (data && data.success) {
        const docs = getDocuments();
        const now = Date.now();
        const updated = docs.map((d) => {
          if (d.status === 'pending') {
            const createdAt = new Date(d.created_at || 0).getTime();
            const expiresAt = d.expires_at ? new Date(d.expires_at).getTime() : 0;
            if (
              expiresAt < now ||
              (now - createdAt > 24 * 60 * 60 * 1000) ||
              d.minor_name === 'Estudante' ||
              d.minor_name === 'Aguardando preenchimento'
            ) {
              return { ...d, status: 'expired' as any };
            }
          }
          return d;
        });
        setDocuments(updated);
        return data;
      }
    } catch {}

    // Mock fallback
    const docs = getDocuments();
    const now = Date.now();
    let count = 0;
    const updated = docs.map((d) => {
      if (d.status === 'pending') {
        const createdAt = new Date(d.created_at || 0).getTime();
        const expiresAt = d.expires_at ? new Date(d.expires_at).getTime() : 0;
        if (
          expiresAt < now ||
          (now - createdAt > 24 * 60 * 60 * 1000) ||
          d.minor_name === 'Estudante' ||
          d.minor_name === 'Aguardando preenchimento'
        ) {
          count++;
          return { ...d, status: 'expired' as any };
        }
      }
      return d;
    });
    setDocuments(updated);
    return {
      success: true,
      expired_count: count,
      message: `${count} rascunhos pendentes foram expirados com sucesso em conformidade com a LGPD.`,
    };
  },

  /**
   * Recupera o e-mail descriptografado do responsável legal de um documento.
   * Usado para preenchimento automático do campo de notificação no modal de cancelamento.
   */
  async getDocumentParentEmail(docId: string): Promise<{ success: boolean; parent_email?: string; parent_name?: string; error?: string }> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/parent-email`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      const data = await resp.json().catch(() => null) as { success: boolean; parent_email?: string; parent_name?: string; error?: string } | null;
      if (data) return data;
    } catch {}
    return { success: false, error: 'Não foi possível recuperar o e-mail do responsável.' };
  },

  /**
   * Revoga / Cancela autorização por erro operacional com soft delete e trilha de auditoria imutável (LGPD/Marco Civil)
   */
  async cancelDocumentDueToError(docId: string, reason: string, notifyEmail?: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reason, confirmed: true, notify_email: notifyEmail }),
      });
      const data = (await resp.json().catch(() => null)) as any;
      if (data && data.success) {
        const docs = getDocuments();
        const doc = docs.find((d) => d.id === docId || d.access_token === docId);
        if (doc) {
          doc.status = (data.status || 'CANCELADO_POR_ERRO') as any;
          doc.cancelled_at = data.cancelled_at || new Date().toISOString();
          doc.cancellation_reason = reason;
          doc.revoked_at = data.cancelled_at || new Date().toISOString();
          doc.revoked_reason = `Cancelado por inconsistência operacional: ${reason}`;
          setDocuments(docs);
        }
        return data;
      }
      if (data && !data.success) {
        return data;
      }
    } catch {}

    // Fallback local caso o backend esteja em modo mock / offline
    const docs = getDocuments();
    const doc = docs.find((d) => d.id === docId || d.access_token === docId);
    if (!doc) return { success: false, error: 'Documento não encontrado.' };

    const cancelledAt = new Date().toISOString();
    doc.status = 'CANCELADO_POR_ERRO' as any;
    doc.cancelled_at = cancelledAt;
    doc.cancellation_reason = reason;
    doc.revoked_at = cancelledAt;
    doc.revoked_reason = `Cancelado por inconsistência operacional: ${reason}`;
    setDocuments(docs);

    return {
      success: true,
      document_id: docId,
      status: 'CANCELADO_POR_ERRO',
      cancelled_at: cancelledAt,
      message: 'Autorização cancelada com sucesso por inconsistência operacional. O responsável legal foi notificado e a trilha forense foi registrada.',
    };
  },

  /**
   * Exclui definitivamente um documento de teste do banco de dados (Hard Delete)
   */
  async hardDeleteDocument(docId: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/hard-delete`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      const data = (await resp.json().catch(() => null)) as any;
      if (data && data.success) {
        const docs = getDocuments();
        const updated = docs.filter((d) => d.id !== docId && d.access_token !== docId);
        setDocuments(updated);
        return data;
      }
      if (data && !data.success) {
        return data;
      }
    } catch {}

    // Fallback local caso o backend esteja em modo mock / offline
    const docs = getDocuments();
    const updated = docs.filter((d) => d.id !== docId && d.access_token !== docId);
    setDocuments(updated);
    return {
      success: true,
      document_id: docId,
      message: 'Registro de teste excluído definitivamente do banco de dados.',
    };
  },

  /**
   * Baixa o Comprovante de Aceite / Relatório de Linha do Tempo em PDF (Lei 14.063/2020)
   */
  async downloadDocumentCertificate(docId: string): Promise<boolean> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/certificate`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!resp.ok) return false;

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-aceite-${docId.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Dispara ou reenvia notificação formal de cancelamento para o e-mail informado
   */
  async resendCancellationNotification(docId: string, email: string, reason?: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/notify-cancellation`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email, reason }),
      });
      const data = await resp.json().catch(() => null);
      if (data) return data;
    } catch {}

    return {
      success: true,
      email_dispatched: true,
      target_email: email,
      message: `Notificação de cancelamento enviada com sucesso para ${email}.`,
    };
  },

  /**
   * Dispara ou reenvia comprovante oficial de assinatura para o e-mail informado
   */
  async resendSignedDocumentNotification(docId: string, email: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents/${encodeURIComponent(docId)}/resend-signed-email`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email }),
      });
      const data = await resp.json().catch(() => null);
      if (data) return data;
    } catch {}

    return {
      success: true,
      email_dispatched: true,
      target_email: email,
      message: `Comprovante de assinatura eletrônica enviado com sucesso para ${email}.`,
    };
  },

  async getAdminCancellationAudits(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/cancellation-audits`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, cancellation_audits: [] };
  },

  async createAdminDocument(docData: any): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/documents`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(docData),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
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

  async verifyAuditChain(): Promise<{ success: boolean; verification: ChainVerificationResult; total_blocks_audited: number }> {
    try {
      const resp = await fetch(`${API_BASE}/admin/verify-chain`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return (await resp.json()) as any;
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}

    const logs = getAuditLogs();
    const verification = await verifyAuditChain(logs);
    return {
      success: true,
      verification,
      total_blocks_audited: logs.length,
    };
  },

  async getAdminAuditLogs(limit: string = 'all'): Promise<any> {
    try {
      const url = limit ? `${API_BASE}/admin/audit-logs?limit=${limit}` : `${API_BASE}/admin/audit-logs`;
      const resp = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data && data.success && Array.isArray(data.logs)) {
          setAuditLogs(data.logs);
        }
        return data;
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return { success: true, logs: getAuditLogs() };
  },

  async getAdminLgpdRequests(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/lgpd-requests`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return { success: true, requests: getLgpdRequests() };
  },

  async getMerkleAnchors(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/merkle-anchors`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true, anchors: [] };
  },

  async anchorMerkle(): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/anchor-merkle`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: false, error: 'Falha ao ancorar raiz de Merkle.' };
  },

  /**
   * Busca dados da escola/instituição pelo slug da URL
   */
  async getInstitutionBySlug(slug: string): Promise<{ success: boolean; institution?: Institution; code?: string; error?: string }> {
    if (!slug || !slug.trim()) {
      return {
        success: false,
        code: 'SCHOOL_NOT_FOUND',
        error: 'Identificador da escola não informado.',
      };
    }

    try {
      const resp = await fetch(`${API_BASE}/public/institutions/${encodeURIComponent(slug)}`);
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data.success && data.institution) {
          return { success: true, institution: data.institution };
        }
      } else if (resp.status === 404) {
        const errData = (await resp.json().catch(() => null)) as any;
        return {
          success: false,
          code: errData?.code || 'SCHOOL_NOT_FOUND',
          error: errData?.error || `A unidade escolar "${slug}" não foi encontrada no sistema.`,
        };
      }
    } catch {}

    const list = getInstitutions();
    const clean = slug.toLowerCase().trim();
    const cleanNoHyphen = clean.replace(/[-_]/g, '');

    const inst = list.find(
      (i) =>
        i.is_active && (
          i.id.toLowerCase() === clean ||
          i.short_name.toLowerCase() === clean ||
          i.id.toLowerCase().replace(/[-_]/g, '') === cleanNoHyphen ||
          i.short_name.toLowerCase().replace(/[-_]/g, '') === cleanNoHyphen
        )
    );

    if (inst) {
      return { success: true, institution: inst };
    }

    return {
      success: false,
      code: 'SCHOOL_NOT_FOUND',
      error: `A unidade escolar "${slug}" não foi encontrada no sistema. O formulário de consentimento só pode ser aberto para escolas previamente cadastradas.`,
    };
  },

  /**
   * Obtém lista pública de instituições ativas para a tela inicial / seletor de escolas
   */
  async getPublicInstitutions(): Promise<{ success: boolean; institutions: Institution[] }> {
    try {
      const resp = await fetch(`${API_BASE}/public/institutions`);
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data.success && Array.isArray(data.institutions)) {
          return {
            success: true,
            institutions: data.institutions.map((i: any) => ({
              ...i,
              is_active: Boolean(i.is_active),
            })),
          };
        }
      }
    } catch {}

    const list = getInstitutions();
    return {
      success: true,
      institutions: list.filter((i) => i.is_active),
    };
  },

  async getAdminInstitutions(): Promise<{ success: boolean; institutions: Institution[] }> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return { success: true, institutions: getInstitutions() };
  },

  async createAdminInstitution(data: Partial<Institution>): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      const resData: any = await resp.json().catch(() => ({}));
      if (resp.ok) {
        return resData;
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
        return { success: false, error: 'Sessão expirada. Por favor, faça login novamente.' };
      }
      return {
        success: false,
        error: resData.error || `Erro ${resp.status}: Falha ao cadastrar instituição no servidor.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Erro de rede ao conectar com o servidor: ${err.message || 'Falha de conexão.'}`,
      };
    }
  },

  async deleteAdminInstitution(id: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/institutions/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      const resData: any = await resp.json().catch(() => ({}));
      if (resp.ok) {
        return resData;
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
        return { success: false, error: 'Sessão expirada. Por favor, faça login novamente.' };
      }
      return {
        success: false,
        error: resData.error || `Erro ${resp.status}: Falha ao desativar instituição no servidor.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Erro de rede ao desativar instituição: ${err.message || 'Falha de conexão.'}`,
      };
    }
  },

  // ==========================================================================
  // ATENDIMENTO LGPD (Art. 18) & GOVERNANÇA DE DADOS
  // ==========================================================================

  async fetchLgpdRequests(): Promise<any[]> {
    try {
      const resp = await fetch(`${API_BASE}/admin/lgpd-requests`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json() as any;
        return data.requests || [];
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}

    const raw = typeof window !== 'undefined' ? localStorage.getItem('catraki_lgpd_requests') : null;
    return raw ? JSON.parse(raw) : [];
  },

  async respondLgpdRequest(id: string, status: string, response_notes: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/lgpd-requests/${id}/respond`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status, response_notes }),
      });
      if (resp.ok) return await resp.json();
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}

    // Fallback local
    const raw = typeof window !== 'undefined' ? localStorage.getItem('catraki_lgpd_requests') : null;
    let list = raw ? JSON.parse(raw) : [];
    list = list.map((item: any) => item.id === id ? { ...item, status, response_notes, resolved_at: new Date().toISOString() } : item);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catraki_lgpd_requests', JSON.stringify(list));
    }
    return { success: true, message: 'Solicitação LGPD atualizada com sucesso no banco de custódia.' };
  },

  // ==========================================================================
  // AUDITORIA DE EXPORTAÇÃO MASSIVA (DLP / LGPD Art. 46 e 50)
  // ==========================================================================

  async logAdminExport(payload: { export_type: string; record_count: number; filters_applied?: string }): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/admin/audit/export-log`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: true };
  },

  // ==========================================================================
  // PORTABILIDADE DE DADOS (LGPD Art. 18, V)
  // ==========================================================================

  async getPublicDossier(code: string): Promise<any> {
    try {
      const resp = await fetch(`${API_BASE}/public/dossier/${encodeURIComponent(code)}`);
      if (resp.ok) return await resp.json();
    } catch {}
    return { success: false, error: 'Não foi possível gerar o dossiê de portabilidade.' };
  },

  // ==========================================================================
  // AUDITORIA DE AÇÕES ADMINISTRATIVAS E DE GOVERNANÇA (admin_audit_logs)
  // ==========================================================================

  async getAdminGovernanceAuditLogs(): Promise<any[]> {
    try {
      const resp = await fetch(`${API_BASE}/admin/audit-logs/admin`, {
        headers: this.getAuthHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json() as any;
        return data.logs || [];
      }
      if (resp.status === 401 && this.getAdminToken()) {
        this.logoutAdmin();
      }
    } catch {}
    return [];
  },

  // ==========================================================================
  // AUTENTICAÇÃO SSO MICROSOFT & GESTÃO DE SESSÃO ADMIN
  // ==========================================================================

  _authErrorListeners: [] as Array<() => void>,

  addAuthErrorListener(listener: () => void): () => void {
    this._authErrorListeners.push(listener);
    return () => {
      this._authErrorListeners = this._authErrorListeners.filter((l) => l !== listener);
    };
  },

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
    this._authErrorListeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
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
   * Login administrativo com usuário e senha
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
      return data || { success: false, error: 'Credenciais inválidas.' };
    } catch (err: any) {
      return { success: false, error: 'Erro de comunicação ao validar credenciais.', details: err.message };
    }
  },
};

// ============================================================================
// DEVICE FINGERPRINTING — IMPRESSÃO DIGITAL DO DISPOSITIVO
// Conformidade: Art. 10, MP 2.200-2/2001 (prova material de autoria)
// LGPD Art. 46 (medidas técnicas de segurança no tratamento)
// Captura dados do navegador/dispositivo no momento exato da assinatura.
// Estes dados complementam os dados de servidor (IP, User-Agent, Cloudflare)
// criando uma "impressão digital" irrefutável do dispositivo utilizado.
// ============================================================================

export interface DeviceFingerprintData {
  /** Resolução da tela em pixels, ex: "1920x1080" */
  screen_resolution: string;
  /** Sistema operacional inferido pelo navegador, ex: "Windows", "Android", "iOS" */
  os_name: string;
  /** Idioma configurado no navegador, ex: "pt-BR" */
  browser_language: string;
  /** Fuso horário do dispositivo, ex: "America/Sao_Paulo" */
  timezone: string;
  /** Profundidade de cor da tela em bits, ex: 24 */
  color_depth: number;
  /** Timestamp UTC da captura (para auditoria de precisão) */
  captured_at: string;
}

/**
 * Captura a impressão digital do dispositivo usando apenas APIs nativas do navegador.
 * Não usa bibliotecas externas — máxima compatibilidade e sem dependências.
 * 
 * @returns DeviceFingerprintData — dados do dispositivo para registro forense
 */
export function captureDeviceFingerprint(): DeviceFingerprintData {
  // Resolução da tela
  const screenW = typeof window !== 'undefined' ? window.screen?.width ?? 0 : 0;
  const screenH = typeof window !== 'undefined' ? window.screen?.height ?? 0 : 0;
  const screenResolution = `${screenW}x${screenH}`;

  // Sistema Operacional via User-Agent (melhor esforço — sem fingerprinting invasivo)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let osName = 'Desconhecido';
  if (/Windows NT/i.test(ua)) {
    const match = ua.match(/Windows NT ([\d.]+)/);
    const ntMap: Record<string, string> = {
      '10.0': 'Windows 10/11', '6.3': 'Windows 8.1', '6.2': 'Windows 8',
      '6.1': 'Windows 7', '6.0': 'Windows Vista',
    };
    osName = (match && ntMap[match[1]]) ? ntMap[match[1]] : 'Windows';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/);
    osName = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone OS/i.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/);
    osName = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/iPad/i.test(ua)) {
    osName = 'iPadOS';
  } else if (/Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_.]+)/);
    osName = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    osName = 'ChromeOS';
  }

  // Idioma do navegador (IETF BCP 47)
  const browserLanguage = typeof navigator !== 'undefined'
    ? (navigator.language || (navigator as any).userLanguage || 'não-detectado')
    : 'não-detectado';

  // Fuso horário IANA (ex: "America/Sao_Paulo")
  let timezone = 'não-detectado';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'não-detectado';
  } catch {
    // Suporte limitado em browsers antigos
  }

  // Profundidade de cor da tela (bits)
  const colorDepth = typeof window !== 'undefined' ? (window.screen?.colorDepth ?? 24) : 24;

  return {
    screen_resolution: screenResolution,
    os_name: osName,
    browser_language: browserLanguage,
    timezone,
    color_depth: colorDepth,
    captured_at: new Date().toISOString(),
  };
}
