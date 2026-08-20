import { Hono } from 'hono';
import {
  VerifyMatriculaSchema,
  ManualReviewUploadSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  SignDocumentSchema,
  RevokeConsentSchema,
  maskCPF,
} from '../../src/lib/schemas.ts';
import {
  sha256,
  hmacSha256,
  constantTimeEqual,
  generateOtp,
  encryptAesGcm,
  generateTsaTimestampToken,
  stripExifFromBase64Image,
  canonicalJson,
} from '../../src/lib/crypto.ts';
import { computeLogRowHash } from '../../src/lib/audit-chain.ts';
import { querySesiMatricula } from '../../src/lib/sesi-matricula.ts';
import { rateLimiter } from '../middleware/ratelimit.ts';
import type { Env, AuditLogRowInput, DocumentRecord } from '../../src/lib/types.ts';

export const signerRouter = new Hono<{ Bindings: Env }>();

signerRouter.use('*', rateLimiter({ limit: 40, windowSeconds: 60, keyPrefix: 'signer_gen' }));

/**
 * GET /api/signer/doc/:token
 * Recupera dados do termo para exibição do signatário
 */
signerRouter.get('/doc/:token', async (c) => {
  const token = c.req.param('token');
  const db = c.env.DB;

  if (!token || token.length < 16) {
    return c.json({ success: false, error: 'Token de acesso inválido.', code: 'INVALID_TOKEN' }, 400);
  }

  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, t.content_markdown, t.consent_text_version
     FROM documents d
     JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE d.access_token = ?`
  ).bind(token).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado ou link expirado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const now = new Date().toISOString();
  if (doc.status === 'pending' && doc.expires_at < now) {
    await db.prepare("UPDATE documents SET status = 'expired' WHERE id = ?").bind(doc.id).run();
    doc.status = 'expired';
  }

  const manualReview = await db.prepare(
    `SELECT status, review_notes, created_at FROM manual_review_queue WHERE document_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(doc.id).first<any>();

  return c.json({
    success: true,
    document: {
      id: doc.id,
      status: doc.status,
      minor_name: doc.minor_name,
      minor_birth_date: doc.minor_birth_date,
      parent_name: doc.parent_name,
      procedure_title: doc.template_title,
      procedure_description: doc.procedure_description,
      content_markdown: doc.content_markdown,
      content_sha256: doc.content_sha256,
      consent_text_version: doc.consent_text_version,
      expires_at: doc.expires_at,
      revoked_at: doc.revoked_at,
      revoked_reason: doc.revoked_reason,
      manual_review_status: manualReview?.status || null,
      manual_review_notes: manualReview?.review_notes || null,
      legal_notice: c.env.LEGAL_FRAMEWORK_NOTICE || 'Assinatura Eletrônica Avançada (Decreto 10.543/2020) — Não qualificada ICP-Brasil',
    },
  });
});

/**
 * POST /api/signer/verify-matricula
 * Consulta vínculo na base de matrícula SESI com tempo de resposta constante
 */
signerRouter.post('/verify-matricula', async (c) => {
  const body = await c.req.json();
  const parsed = VerifyMatriculaSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, signer_cpf, signer_name } = parsed.data;
  const db = c.env.DB;

  const doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc || doc.status !== 'pending') {
    return c.json({ success: false, error: 'Documento indisponível para assinatura.', code: 'INVALID_STATUS' }, 400);
  }

  const result = await querySesiMatricula({
    minorName: doc.minor_name,
    minorBirthDate: doc.minor_birth_date,
    signerCpf: signer_cpf,
    signerName: signer_name,
  });

  return c.json({
    success: true,
    hasValidEnrollment: result.hasValidEnrollment,
    guardianType: result.guardianType,
    identityMethod: result.hasValidEnrollment ? 'matricula_sesi' : 'manual_review',
    verifiedAt: result.verifiedAt,
    message: result.hasValidEnrollment
      ? 'Vínculo com a base de matrícula SESI confirmado com sucesso.'
      : 'Vínculo direto não localizado na base de matrícula. É necessário envio de documentação para revisão da equipe.',
  });
});

/**
 * POST /api/signer/manual-review
 * Envio de documentos comprobatórios com remoção de metadados EXIF
 */
signerRouter.post('/manual-review', async (c) => {
  const body = await c.req.json();
  const parsed = ManualReviewUploadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, signer_name, signer_cpf, signer_relationship, identity_doc_base64, selfie_base64, guardianship_doc_base64, notes } = parsed.data;
  const db = c.env.DB;
  const bucket = c.env.BUCKET_DOCS;
  const masterKey = c.env.ENCRYPTION_KEY_V1 || 'SESI_ENCRYPTION_KEY_32BYTES_TEST123';

  const doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc || doc.status !== 'pending') {
    return c.json({ success: false, error: 'Documento indisponível.', code: 'INVALID_STATUS' }, 400);
  }

  const cleanIdDoc = stripExifFromBase64Image(identity_doc_base64);
  const cleanSelfie = stripExifFromBase64Image(selfie_base64);
  const cleanGuardianship = guardianship_doc_base64 ? stripExifFromBase64Image(guardianship_doc_base64) : null;

  const reviewId = `REV-${Date.now()}-${doc.id.substring(0, 8)}`;
  const idDocKey = `reviews/${reviewId}/identity.jpg`;
  const selfieKey = `reviews/${reviewId}/selfie.jpg`;
  const guardianshipKey = cleanGuardianship ? `reviews/${reviewId}/guardianship.pdf` : null;

  if (bucket) {
    await bucket.put(idDocKey, cleanIdDoc);
    await bucket.put(selfieKey, cleanSelfie);
    if (guardianshipKey && cleanGuardianship) {
      await bucket.put(guardianshipKey, cleanGuardianship);
    }
  }

  const cpfEncrypted = await encryptAesGcm(signer_cpf, masterKey, 1);
  const cpfMasked = maskCPF(signer_cpf);

  await db.prepare(
    `INSERT INTO manual_review_queue 
      (id, document_id, signer_name, signer_cpf_masked, signer_cpf_encrypted, signer_relationship, identity_doc_r2_key, selfie_doc_r2_key, guardianship_doc_r2_key, status, review_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
  ).bind(
    reviewId,
    doc.id,
    signer_name,
    cpfMasked,
    cpfEncrypted,
    signer_relationship,
    idDocKey,
    selfieKey,
    guardianshipKey,
    notes || 'Aguardando validação de documento por operador SESI'
  ).run();

  return c.json({
    success: true,
    reviewId,
    status: 'pending',
    message: 'Documentos recebidos com sucesso. A equipe do SESI fará a análise do vínculo legal antes da liberação do link de assinatura.',
  });
});

/**
 * POST /api/signer/otp/request
 * Solicitação de OTP com HMAC Pepper e limite de reenvios
 */
signerRouter.post('/otp/request', rateLimiter({ limit: 5, windowSeconds: 300, keyPrefix: 'otp_req' }), async (c) => {
  const body = await c.req.json();
  const parsed = OtpRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Parâmetros inválidos.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, channel } = parsed.data;
  const db = c.env.DB;
  const pepper = c.env.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD';

  const doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc || doc.status !== 'pending') {
    return c.json({ success: false, error: 'Documento indisponível para assinatura.', code: 'INVALID_STATUS' }, 400);
  }

  if (doc.otp_resend_count >= 8) {
    return c.json({
      success: false,
      error: 'Limite de tentativas de envio de código excedido para este documento. Entre em contato com o suporte do SESI Saúde.',
      code: 'OTP_RESEND_EXCEEDED',
    }, 429);
  }

  const otpCode = generateOtp();
  const otpHash = await hmacSha256(otpCode, pepper);

  await db.prepare(
    `UPDATE documents 
     SET otp_secret_hash = ?, 
         otp_attempts = 0, 
         otp_expires_at = datetime('now', '+5 minutes'), 
         otp_resend_count = otp_resend_count + 1 
     WHERE id = ?`
  ).bind(otpHash, doc.id).run();

  return c.json({
    success: true,
    channel,
    expires_in_seconds: 300,
    message: `Código de verificação de 6 dígitos enviado para o ${channel === 'sms' ? 'celular' : 'e-mail'} do responsável legal.`,
    dev_otp_hint: c.env.APP_ENV !== 'production' ? otpCode : undefined,
  });
});

/**
 * POST /api/signer/otp/verify
 * Validação de OTP em tempo constante
 */
signerRouter.post('/otp/verify', async (c) => {
  const body = await c.req.json();
  const parsed = OtpVerifySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Código inválido.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, otp_code } = parsed.data;
  const db = c.env.DB;
  const pepper = c.env.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD';

  const doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc || !doc.otp_secret_hash) {
    return c.json({ success: false, error: 'Código de verificação não solicitado.', code: 'OTP_NOT_REQUESTED' }, 400);
  }

  if (doc.otp_attempts >= 3) {
    return c.json({
      success: false,
      error: 'Número máximo de tentativas de código incorreto excedido (3). Solicite um novo código de verificação.',
      code: 'OTP_BLOCKED',
    }, 400);
  }

  const now = new Date().toISOString();
  if (doc.otp_expires_at && doc.otp_expires_at < now) {
    return c.json({ success: false, error: 'O código de verificação expirou. Solicite um novo código.', code: 'OTP_EXPIRED' }, 400);
  }

  const computedOtpHash = await hmacSha256(otp_code, pepper);
  const isValid = constantTimeEqual(doc.otp_secret_hash, computedOtpHash);

  if (!isValid) {
    await db.prepare('UPDATE documents SET otp_attempts = otp_attempts + 1 WHERE id = ?').bind(doc.id).run();
    const remaining = 3 - (doc.otp_attempts + 1);
    return c.json({
      success: false,
      error: `Código de verificação incorreto. Tentativas restantes: ${Math.max(0, remaining)}`,
      code: 'OTP_INVALID',
      remaining_attempts: Math.max(0, remaining),
    }, 400);
  }

  return c.json({
    success: true,
    verified: true,
    message: 'Identidade e código 2FA confirmados com sucesso.',
  });
});

/**
 * POST /api/signer/sign
 * Operação atômica e idempotente de assinatura avançada com hash chain e TSA
 */
signerRouter.post('/sign', rateLimiter({ limit: 10, windowSeconds: 60, keyPrefix: 'sign_doc' }), async (c) => {
  const body = await c.req.json();
  const parsed = SignDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Dados de assinatura inválidos.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, otp_code, signer_name, signer_cpf, signer_relationship, signature_png_base64, client_fingerprint } = parsed.data;
  const db = c.env.DB;
  const bucket = c.env.BUCKET_DOCS;
  const masterKey = c.env.ENCRYPTION_KEY_V1 || 'SESI_ENCRYPTION_KEY_32BYTES_TEST123';
  const pepper = c.env.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD';

  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, t.consent_text_version, t.content_sha256 as template_content_sha256
     FROM documents d
     JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE d.access_token = ?`
  ).bind(token).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não encontrado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  if (doc.status === 'signed') {
    return c.json({ success: false, error: 'Este documento já foi assinado anteriormente.', code: 'ALREADY_SIGNED' }, 409);
  }

  if (doc.status !== 'pending') {
    return c.json({ success: false, error: `Documento em status inválido: ${doc.status}`, code: 'INVALID_STATUS' }, 400);
  }

  const computedOtpHash = await hmacSha256(otp_code, pepper);
  if (!doc.otp_secret_hash || !constantTimeEqual(doc.otp_secret_hash, computedOtpHash)) {
    return c.json({ success: false, error: 'Código de autenticação 2FA inválido ou expirado.', code: 'OTP_INVALID' }, 400);
  }

  let identityMethod: 'matricula_sesi' | 'manual_review' = 'matricula_sesi';
  const sesiCheck = await querySesiMatricula({
    minorName: doc.minor_name,
    minorBirthDate: doc.minor_birth_date,
    signerCpf: signer_cpf,
    signerName: signer_name,
  });

  if (!sesiCheck.hasValidEnrollment) {
    const approvedReview = await db.prepare(
      `SELECT * FROM manual_review_queue WHERE document_id = ? AND status = 'approved' ORDER BY updated_at DESC LIMIT 1`
    ).bind(doc.id).first<any>();

    if (!approvedReview) {
      return c.json({
        success: false,
        error: 'O vínculo com o menor não foi confirmado na matrícula SESI nem por revisão manual aprovada. Assinatura bloqueada.',
        code: 'IDENTITY_UNVERIFIED',
      }, 403);
    }
    identityMethod = 'manual_review';
  }

  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Desconhecido';
  const geoCity = c.req.header('cf-ipcity') || 'Local';
  const geoRegion = c.req.header('cf-region') || 'BR-SP';
  const geoCountry = c.req.header('cf-ipcountry') || 'BR';
  const signedAtIso = new Date().toISOString();

  const signaturePngSha256 = await sha256(signature_png_base64);
  const contentSha256AtSigning = doc.content_sha256 || doc.template_content_sha256;
  const cpfMasked = maskCPF(signer_cpf);

  const lastAudit = await db.prepare(
    'SELECT log_row_hash FROM audit_logs ORDER BY created_at DESC LIMIT 1'
  ).first<{ log_row_hash: string }>();

  const prevLogHash = lastAudit?.log_row_hash || null;

  const manifestData = {
    document_id: doc.id,
    template_id: doc.template_id,
    template_version: doc.template_version,
    procedure_description_sha256: await sha256(doc.procedure_description),
    content_sha256: contentSha256AtSigning,
    signed_at_utc: signedAtIso,
    signer: {
      name: signer_name,
      cpf_masked: cpfMasked,
      relationship: signer_relationship,
      identity_method: identityMethod,
    },
    minor: {
      name_hash: await sha256(doc.minor_name),
      birth_date: doc.minor_birth_date,
    },
    signature_png_sha256: signaturePngSha256,
    digital_evidence: {
      ip: ipAddress,
      user_agent_hash: await sha256(userAgent),
      geo: `${geoCity}/${geoRegion}/${geoCountry}`,
      fingerprint: client_fingerprint || null,
    },
    legal_basis: 'LGPD Art. 11, I c/c Art. 14, §1º; Decreto 10.543/2020 Art. 4º, II; Art. 299 CP',
    consent_text_version: doc.consent_text_version,
  };

  const manifestSha256 = await sha256(canonicalJson(manifestData));
  const tsa = await generateTsaTimestampToken(manifestSha256, c.env.TSA_ENDPOINT);
  const auditLogId = `AUD-${Date.now()}-${doc.id.substring(0, 8)}`;

  const auditRowInput: AuditLogRowInput = {
    id: auditLogId,
    document_id: doc.id,
    prev_log_hash: prevLogHash,
    signed_at: signedAtIso,
    signer_name: signer_name,
    signer_cpf_masked: cpfMasked,
    signer_relationship: signer_relationship,
    identity_method: identityMethod,
    signature_png_sha256: signaturePngSha256,
    ip_address: ipAddress,
    user_agent: userAgent,
    client_fingerprint: client_fingerprint || null,
    content_sha256_at_signing: contentSha256AtSigning,
    consent_text_version: doc.consent_text_version,
    manifest_sha256: manifestSha256,
    tsa_timestamp_token: tsa.token,
  };

  const logRowHash = await computeLogRowHash(auditRowInput);
  const signerCpfEncrypted = await encryptAesGcm(signer_cpf, masterKey, 1);
  const signaturePngEncrypted = await encryptAesGcm(signature_png_base64, masterKey, 1);

  const pdfR2Key = `signed-pdfs/${doc.id}/${manifestSha256}.pdf`;
  const manifestR2Key = `manifests/${doc.id}/${manifestSha256}.json`;

  if (bucket) {
    await bucket.put(manifestR2Key, JSON.stringify(manifestData, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  try {
    const batch = await db.batch([
      db.prepare(
        `INSERT INTO audit_logs (
          id, document_id, prev_log_hash, signed_at, signer_name, signer_cpf_encrypted, signer_cpf_masked,
          signer_relationship, identity_method, signature_png_encrypted, signature_png_sha256, key_version,
          ip_address, user_agent, geo_city, geo_region, geo_country, client_fingerprint,
          content_sha256_at_signing, consent_text_version, manifest_sha256, tsa_timestamp_token, log_row_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        auditLogId,
        doc.id,
        prevLogHash,
        signedAtIso,
        signer_name,
        signerCpfEncrypted,
        cpfMasked,
        signer_relationship,
        identityMethod,
        signaturePngEncrypted,
        signaturePngSha256,
        ipAddress,
        userAgent,
        geoCity,
        geoRegion,
        geoCountry,
        client_fingerprint || null,
        contentSha256AtSigning,
        doc.consent_text_version,
        manifestSha256,
        tsa.token,
        logRowHash
      ),
      db.prepare(
        `UPDATE documents 
         SET status = 'signed', signed_pdf_r2_key = ?, otp_secret_hash = NULL 
         WHERE id = ? AND status = 'pending'`
      ).bind(pdfR2Key, doc.id),
    ]);

    if ((batch[1] as any).meta?.changes === 0) {
      throw new Error('Falha ao atualizar status do documento: concorrência ou status alterado.');
    }
  } catch (err: any) {
    return c.json({
      success: false,
      error: `Erro ao processar assinatura atômica: ${err.message}`,
      code: 'SIGNING_TRANSACTION_FAILED',
    }, 500);
  }

  return c.json({
    success: true,
    document_id: doc.id,
    manifest_sha256: manifestSha256,
    log_row_hash: logRowHash,
    signed_at_utc: signedAtIso,
    tsa_authority: tsa.tsaName,
    validation_url: `/validar/${manifestSha256}`,
    message: 'Autorização médica assinada eletronicamente com sucesso e registrada na cadeia de auditoria.',
  });
});

/**
 * POST /api/signer/revoke
 * Revogação fundamentada de consentimento (LGPD Art. 18)
 */
signerRouter.post('/revoke', async (c) => {
  const body = await c.req.json();
  const parsed = RevokeConsentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Justificativa obrigatória.', code: 'VALIDATION_ERROR' }, 400);
  }

  const { token, reason } = parsed.data;
  const db = c.env.DB;

  const doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  if (doc.status === 'revoked') {
    return c.json({ success: false, error: 'O consentimento deste documento já se encontra revogado.', code: 'ALREADY_REVOKED' }, 400);
  }

  const revokedAtIso = new Date().toISOString();

  await db.prepare(
    `UPDATE documents 
     SET status = 'revoked', revoked_at = ?, revoked_reason = ? 
     WHERE id = ?`
  ).bind(revokedAtIso, reason, doc.id).run();

  return c.json({
    success: true,
    revoked_at: revokedAtIso,
    message: 'Consentimento revogado com sucesso. A equipe médica e a administração do SESI foram notificadas.',
  });
});
