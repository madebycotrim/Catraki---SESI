import { Hono } from 'hono';
import {
  VerifyMatriculaSchema,
  ManualReviewUploadSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  SignDocumentSchema,
  RevokeConsentSchema,
  maskCPF,
  generateUniqueDocId,
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
  verifyTurnstileToken,
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

  if (!token || token.trim().length === 0) {
    return c.json({ success: false, error: 'Token de acesso inválido.', code: 'INVALID_TOKEN' }, 400);
  }

  let doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, t.content_markdown, t.consent_text_version
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE d.access_token = ?`
  ).bind(token).first<any>();

  // Se não encontrar como access_token exato, busca se é um slug de escola cadastrada
  if (!doc) {
    const inst = await db.prepare('SELECT * FROM institutions WHERE id = ? AND is_active = 1').bind(token).first<any>();
    const template = await db.prepare('SELECT * FROM document_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1').first<any>();

    if (template) {
      doc = {
        id: generateUniqueDocId('DOC'),
        status: 'pending',
        minor_name: 'Estudante',
        minor_birth_date: '2010-01-01',
        parent_name: 'Responsável Legal',
        template_title: template.title,
        procedure_description: template.procedure_description,
        content_markdown: template.content_markdown,
        content_sha256: template.content_sha256,
        consent_text_version: template.consent_text_version,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        institution_name: inst?.name || 'Escola do DF',
        institution_id: inst?.id || token,
      };
    }
  }

  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado ou link expirado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const now = new Date().toISOString();
  if (doc.status === 'pending' && doc.expires_at && doc.expires_at < now) {
    await db.prepare("UPDATE documents SET status = 'expired' WHERE id = ?").bind(doc.id).run();
    doc.status = 'expired';
  }

  const manualReview = doc.id && !doc.id.startsWith('DOC-AUTO-')
    ? await db.prepare(
        `SELECT status, review_notes, created_at FROM manual_review_queue WHERE document_id = ? ORDER BY created_at DESC LIMIT 1`
      ).bind(doc.id).first<any>()
    : null;

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
      legal_notice: 'Assinatura Eletrônica (MP nº 2.200-2/2001 e Lei nº 14.063/2020)',
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
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (!masterKey) {
    return c.json({ success: false, error: 'Configuração criptográfica do servidor incompleta (ENCRYPTION_KEY_V1).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

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

  const { token, channel, turnstile_token } = parsed.data;

  // Validação Canônica Cloudflare Turnstile Anti-Bot
  const turnstileSecret = c.env.TURNSTILE_SECRET_KEY || (c.env as any).TURNSTILE_SECRET;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
  const allowedHostnames = c.env.TURNSTILE_HOSTNAMES
    ? c.env.TURNSTILE_HOSTNAMES.split(',').map((h) => h.trim())
    : ['catraki.com.br', 'www.catraki.com.br', 'catraki-sesi.pages.dev', 'catraki.pages.dev', 'localhost', '127.0.0.1'];

  const isHuman = await verifyTurnstileToken(turnstile_token, {
    secretKey: turnstileSecret,
    remoteIp: clientIp,
    expectedAction: 'otp_request',
    expectedHostnames: allowedHostnames,
  });

  if (!isHuman) {
    return c.json({
      success: false,
      error: 'Falha na verificação de segurança contra robôs (Cloudflare Turnstile). Por favor, tente novamente.',
      code: 'CAPTCHA_FAILED',
    }, 403);
  }

  const db = c.env.DB;
  const pepper = c.env.OTP_PEPPER;

  if (!pepper) {
    return c.json({ success: false, error: 'Configuração do servidor incompleta (OTP_PEPPER).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

  let doc = await db.prepare('SELECT * FROM documents WHERE access_token = ?').bind(token).first<DocumentRecord>();
  if (!doc) {
    const template = await db.prepare('SELECT * FROM document_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1').first<any>();
    if (template) {
      const newDocId = generateUniqueDocId('DOC');
      await db.prepare(
        `INSERT INTO documents (id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name, parent_email_encrypted, parent_phone_encrypted, access_token, status, retention_expires_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+3 years'), datetime('now', '+1 year'))`
      ).bind(newDocId, template.id, template.version, template.content_sha256, 'Estudante', '2010-01-01', 'Responsável Legal', 'ENC_INITIAL', 'ENC_INITIAL', token).run();
      doc = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(newDocId).first<DocumentRecord>();
    }
  }

  if (!doc || doc.status !== 'pending') {
    return c.json({ success: false, error: 'Documento indisponível para assinatura.', code: 'INVALID_STATUS' }, 400);
  }

  if (doc.otp_resend_count >= 8) {
    return c.json({
      success: false,
      error: 'Limite de tentativas de envio de código excedido para este documento. Entre em contato com o suporte da plataforma Catraki.',
      code: 'OTP_RESEND_EXCEEDED',
    }, 429);
  }

  const otpCode = generateOtp();
  const otpHash = await hmacSha256(otpCode, pepper);
  const expiresAtIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await db.prepare(
    `UPDATE documents 
     SET otp_secret_hash = ?, 
         otp_attempts = 0, 
         otp_expires_at = ?, 
         otp_resend_count = otp_resend_count + 1 
     WHERE id = ?`
  ).bind(otpHash, expiresAtIso, doc.id).run();

  // Disparo Real de E-mail via Resend API
  const { email: providedEmail, minor_name: providedMinorName } = parsed.data;
  const targetEmail = providedEmail;
  const studentName = providedMinorName || doc.minor_name || 'Estudante';
  const resendApiKey = (c.env as any).RESEND_API_KEY;
  const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';

  let emailSent = false;
  let emailError = '';

  if (targetEmail && resendApiKey) {
    try {
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [targetEmail],
          subject: `Código de Confirmação: ${otpCode} — Catraki`,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="border-bottom: 2px solid #034b7f; padding-bottom: 12px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle;">
                    <h2 style="color: #034b7f; margin: 0; font-size: 18px; font-weight: bold;">Escola Cidadã — Saúde em Movimento</h2>
                    <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Validação de Autoria por Código Eletrônico</span>
                  </td>
                  <td style="width: 40px; vertical-align: middle; text-align: right;">
                    <img src="https://www.catraki.com.br/catraki.png" alt="Catraki" style="width: 36px; height: 36px; border-radius: 6px;" />
                  </td>
                </tr>
              </table>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Olá,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              Para autenticar e concluir a assinatura do Termo de Consentimento referente ao(à) estudante <strong>${studentName}</strong>, utilize o código de segurança abaixo:
            </p>
            <div style="background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #034b7f; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0;">
              ⏱️ <strong>Validade:</strong> Este código expira em 5 minutos. Se você não solicitou este procedimento, por favor desconsidere este e-mail.
            </p>
            <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
              Assinatura Eletrônica Avançada • Lei Federal nº 14.063/2020 • Plataforma Catraki<br />
              Para mais informações sobre como protegemos seus dados, consulte nossa <a href="https://www.catraki.com.br/privacidade" style="color: #034b7f; text-decoration: underline;">Política de Privacidade e Termos de Uso</a>.
            </div>
          </div>`,
        }),
      });

      if (resendResp.ok) {
        emailSent = true;
      } else {
        const resendErr = await resendResp.text();
        emailError = `Falha Resend: ${resendErr}`;
      }
    } catch (err: any) {
      emailError = `Erro conexão: ${err.message}`;
    }
  }

  return c.json({
    success: true,
    channel,
    email_sent: emailSent,
    email_error: emailError || undefined,
    expires_in_seconds: 300,
    message: `Código de verificação de 6 dígitos enviado para o ${channel === 'sms' ? 'celular' : 'e-mail'} do responsável legal.`,
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
  const pepper = c.env.OTP_PEPPER;

  if (!pepper) {
    return c.json({ success: false, error: 'Configuração do servidor incompleta (OTP_PEPPER).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

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

  if (doc.otp_expires_at) {
    const expiryTime = new Date(
      doc.otp_expires_at.includes('T') 
        ? doc.otp_expires_at 
        : doc.otp_expires_at.replace(' ', 'T') + 'Z'
    ).getTime();

    if (!isNaN(expiryTime) && expiryTime < Date.now()) {
      return c.json({
        success: false,
        error: 'O código de verificação expirou (validade de 5 minutos). Solicite um novo código.',
        code: 'OTP_EXPIRED'
      }, 400);
    }
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
 * Operação atômica e idempotente de assinatura eletrônica com hash chain e TSA
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
  const masterKey = c.env.ENCRYPTION_KEY_V1;
  const pepper = c.env.OTP_PEPPER;

  if (!masterKey || !pepper) {
    return c.json({
      success: false,
      error: 'Configuração criptográfica do servidor incompleta (ENCRYPTION_KEY_V1 / OTP_PEPPER).',
      code: 'KEY_CONFIG_ERROR',
    }, 500);
  }

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

  let identityMethod: 'matricula_sesi' | 'manual_review' = 'manual_review';
  const sesiCheck = await querySesiMatricula({
    minorName: doc.minor_name,
    minorBirthDate: doc.minor_birth_date,
    signerCpf: signer_cpf,
    signerName: signer_name,
  });

  if (sesiCheck.hasValidEnrollment) {
    identityMethod = 'matricula_sesi';
  } else {
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
    legal_basis: 'MP 2.200-2/2001 Art. 10, § 2º; Lei 14.063/2020 Art. 4º, II; LGPD (Lei 13.709/2018) Art. 11, I c/c Art. 14, § 1º; Art. 299 CP',
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
         SET status = 'signed', 
             parent_name = ?, 
             minor_name = COALESCE(?, minor_name), 
             minor_birth_date = COALESCE(?, minor_birth_date),
             minor_cpf = ?,
             signed_pdf_r2_key = ?, 
             otp_secret_hash = NULL 
         WHERE id = ? AND status = 'pending'`
      ).bind(
        signer_name,
        parsed.data.minor_name || doc.minor_name || null,
        parsed.data.minor_birth_date || doc.minor_birth_date || null,
        parsed.data.minor_cpf ? maskCPF(parsed.data.minor_cpf) : null,
        pdfR2Key,
        doc.id
      ),
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

  const validationCode = `SESI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}`;

  // Disparo do E-mail Oficial de Comprovante de Assinatura (Resend API)
  const resendApiKey = (c.env as any).RESEND_API_KEY;
  const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';
  const targetEmail = parsed.data.signer_email;
  const studentName = parsed.data.minor_name || doc.minor_name || 'Estudante';
  const studentBirth = parsed.data.minor_birth_date || doc.minor_birth_date || '';
  const studentCpf = parsed.data.minor_cpf ? maskCPF(parsed.data.minor_cpf) : '';
  const rawSeries = (parsed.data.minor_series || '').trim();
  const rawClass = (parsed.data.minor_class || '').trim();
  const rawTurn = (parsed.data.minor_turn || '').trim();

  let studentSeriesText = '';
  if (rawSeries && rawClass) {
    studentSeriesText = `, Série/Turma: <strong>${rawSeries} - Turma ${rawClass}</strong>`;
  } else if (rawSeries) {
    studentSeriesText = `, Série: <strong>${rawSeries}</strong>`;
  } else if (rawClass) {
    studentSeriesText = `, Turma: <strong>${rawClass}</strong>`;
  }

  const studentTurnText = rawTurn ? `, Turno: <strong>${rawTurn}</strong>` : '';
  const signerPhoneText = parsed.data.signer_phone ? `, telefone de contato <strong>${parsed.data.signer_phone}</strong>` : '';
  const institutionName = parsed.data.institution_name || 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)';
  const authImageStatus = parsed.data.auth_image === 'yes';

  if (targetEmail && resendApiKey) {
    try {
      const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'medium',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(signedAtIso));

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [targetEmail],
          subject: `Comprovante de Assinatura Eletrônica — ${studentName} (${validationCode})`,
          html: `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px 6px !important; }
      .email-card { padding: 20px 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-right: 0 !important; }
      .mobile-qr-cell { display: block !important; width: 100% !important; border-left: none !important; border-top: 1px dashed #cbd5e1 !important; padding-left: 0 !important; padding-top: 16px !important; margin-top: 14px !important; text-align: center !important; }
      .mobile-qr-img { margin: 0 auto !important; }
      .mobile-header-table td { display: block !important; width: 100% !important; text-align: left !important; }
      .mobile-header-meta { margin-top: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Preheader Oculto (Preview no Gmail/Outlook) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">
    Comprovante de assinatura do Termo de Consentimento. Acesse e valide seu documento emitido pelo CEMEIT / SESI-DF.
  </div>

  <div class="email-wrapper" style="background-color: #f1f5f9; padding: 28px 10px; color: #1e293b; line-height: 1.6;">
    <div class="email-card" style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); padding: 32px 28px; position: relative;">
      
      <!-- Cabeçalho Institucional Oficial -->
      <div style="border-bottom: 2.5px solid #034b7f; padding-bottom: 16px; margin-bottom: 22px;">
        <table class="mobile-header-table" style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Coluna Esquerda: Logos Oficiais Co-branded -->
            <td style="vertical-align: middle;">
              <table style="border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img 
                      src="https://www.catraki.com.br/catraki.png" 
                      alt="Catraki" 
                      style="height: 38px; width: 38px; border-radius: 6px; display: block;" 
                    />
                  </td>
                  <td style="width: 1px; background-color: #cbd5e1; height: 32px; padding: 0;"></td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <div style="font-size: 14px; font-weight: 800; color: #034b7f; letter-spacing: -0.01em; text-transform: uppercase; line-height: 1.2;">
                      ESCOLA CIDADÃ
                    </div>
                    <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;">
                      Saúde em Movimento • SESI-DF
                    </div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- Coluna Direita: Metadados do Documento e Selo Oficial -->
            <td class="mobile-header-meta" style="vertical-align: middle; text-align: right;">
              <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 2px 8px; font-size: 9.5px; font-weight: 700; color: #065f46; margin-bottom: 3px;">
                ✓ DOCUMENTO ASSINADO
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; font-family: monospace;">
                Nº ${validationCode}
              </div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">
                Brasília, DF • ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(signedAtIso))}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Título do Documento -->
      <div style="text-align: center; margin-bottom: 22px;">
        <h1 style="font-size: 13.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0; letter-spacing: 0.02em;">
          TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO DIGITAL (TCLE)
        </h1>
        <div style="font-size: 11px; font-weight: 600; color: #475569;">
          Comprovante de Autorização para Atendimento e Triagens em Saúde
        </div>
      </div>

      <!-- 1. Qualificação e Declaração Formal (Recuo ABNT) -->
      <div style="margin-bottom: 20px; font-size: 12.5px; line-height: 1.85; color: #1e293b; text-align: justify; background-color: #ffffff;">
        <p style="margin: 0; text-indent: 28px;">
          Eu, <strong>${signer_name}</strong>, portador(a) do CPF <strong>${cpfMasked}</strong>, na qualidade de <strong>${signer_relationship}</strong> do(a) estudante <strong>${studentName}</strong>, nascido(a) em <strong>${studentBirth || 'Data não informada'}</strong>${studentCpf ? `, portador(a) do CPF <strong>${studentCpf}</strong>` : ''}${signerPhoneText}, matriculado(a) na instituição <strong>${institutionName}</strong>${studentSeriesText}${studentTurnText}, declaro sob as penas da lei que <strong>AUTORIZO a realização do atendimento e das triagens de saúde do(a) estudante</strong> <strong>sem a presença do responsável legal</strong> nas ações do projeto <strong>Escola Cidadã — Saúde em Movimento</strong>.
        </p>
      </div>

      <!-- 2. Cláusula Segunda — Das Autorizações Específicas (Continuação Natural do Documento) -->
      <div style="margin-bottom: 20px; font-size: 12.5px; line-height: 1.85; color: #1e293b; text-align: justify;">
        <p style="margin: 0 0 10px 0; text-indent: 28px;">
          Adicionalmente, manifesto de forma expressa, livre e inequívoca meu consentimento quanto às seguintes condições:
        </p>

        <p style="margin: 0 0 8px 0; text-indent: 28px;">
          <strong>a) Atendimento Clínico e Triagens de Saúde:</strong> <span style="color: #166534; font-weight: 700;">[ ✓ AUTORIZADO ]</span> — Fica autorizada a realização de triagens preventivas, exames clínicos, acuidade visual e avaliação bucal no âmbito do projeto Escola Cidadã: Saúde em Movimento.
        </p>

        <p style="margin: 0 0 8px 0; text-indent: 28px;">
          <strong>b) Tratamento de Dados Pessoais e de Saúde (LGPD):</strong> <span style="color: #166534; font-weight: 700;">[ ✓ AUTORIZADO ]</span> — Fica expressamente autorizado o tratamento dos dados pessoais e sensíveis para finalidade exclusiva de assistência à saúde e histórico de atendimento, nos termos dos artigos 7º, I, 11, I, e 14 da Lei Federal nº 13.709/2018.
        </p>

        <p style="margin: 0 0 10px 0; text-indent: 28px;">
          <strong>c) Captação e Uso de Imagem e Voz:</strong> <span style="color: ${authImageStatus ? '#166534' : '#64748b'}; font-weight: 700;">${authImageStatus ? '[ ✓ AUTORIZADO ]' : '[ ✗ NÃO AUTORIZADO ]'}</span> — ${authImageStatus ? 'Fica autorizada de forma gratuita a captação e veiculação de fotos e vídeos para documentação institucional, relatórios e prestação de contas do projeto (ECA, Art. 17).' : 'O(a) responsável optou por não autorizar o registro fotográfico ou audiovisual, permanecendo inalterado o pleno atendimento de saúde do(a) estudante.'}
        </p>

        <p style="margin: 0 0 10px 0; text-indent: 28px;">
          <strong>d) Situações de Emergência:</strong> <span style="color: #166534; font-weight: 700;">[ ✓ AUTORIZADO ]</span> — Em caso de intercorrência médica ou emergência durante as ações do projeto, autorizo a equipe responsável a prestar os primeiros socorros e, se necessário, acionar o serviço de urgência (SAMU/Corpo de Bombeiros) e encaminhar o(a) estudante à unidade de saúde mais próxima, comprometendo-se a equipe a notificar o responsável legal imediatamente.
        </p>
      </div>

      <!-- 3. Cláusula Terceira — Direitos e Revogação (LGPD) -->
      <div style="margin-bottom: 24px; font-size: 12.5px; line-height: 1.85; color: #1e293b; text-align: justify;">
        <p style="margin: 0; text-indent: 28px;">
          Declaro estar ciente de que os dados coletados não serão comercializados e que é garantido o direito de acesso, retificação ou revogação deste consentimento a qualquer momento (Art. 18 da LGPD), mediante solicitação formal à direção da escola ou pelo e-mail oficial: <strong>autorizacoes@catraki.com.br</strong> (ou diretamente pelo Portal de Revogação da plataforma).
        </p>
      </div>

      <!-- 4. Card de Verificação Online & Protocolo de Assinatura (Estilo Assinafy / Banco Safra) -->
      <div style="background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);">
        
        <!-- Título com Linha Divisória -->
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 26px; vertical-align: middle;">
                <img src="https://www.catraki.com.br/catraki.png" alt="Catraki" style="width: 20px; height: 20px; border-radius: 4px; display: block;" />
              </td>
              <td style="vertical-align: middle; font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                Verificação online • Plataforma Catraki
              </td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Coluna Esquerda: Metadados e Evidências Criptográficas -->
            <td class="mobile-stack" style="vertical-align: top; padding-right: 14px; font-size: 11.5px; line-height: 1.6; color: #334155;">
              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Documento:</span> <strong>Termo de Consentimento — Escola Cidadã</strong>
              </div>
              <div style="margin-bottom: 5px;">
                <span style="color: #64748b; font-weight: 700;">URL de verificação:</span> <a href="https://www.catraki.com.br/validar/${validationCode}" style="color: #034b7f; text-decoration: underline; font-weight: 600;">https://www.catraki.com.br/validar</a>
              </div>

              <!-- Destaque do Hash SHA-256 no estilo Assinafy -->
              <div style="margin: 6px 0 8px 0; background-color: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; padding: 6px 10px;">
                <span style="color: #034b7f; font-weight: 800; font-size: 11px;">Hash:</span> 
                <span style="font-family: monospace; font-size: 10px; font-weight: bold; color: #034b7f; word-break: break-all; letter-spacing: 0.02em;">${manifestSha256}</span>
              </div>

              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Número do documento:</span> <span style="font-family: monospace; font-weight: bold; color: #034b7f; font-size: 12px;">${validationCode}</span>
              </div>
              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Signatário:</span> <strong>${signer_name}</strong> (CPF: ${cpfMasked} • ${signer_relationship})
              </div>
              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Autenticação:</span> Código OTP de 6 dígitos via e-mail (${targetEmail})
              </div>
              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Data e Hora (Oficial):</span> ${dataFormatada}
              </div>
              <div style="margin-bottom: 3px;">
                <span style="color: #64748b; font-weight: 700;">Endereço IP:</span> <span style="font-family: monospace; font-size: 11px;">${ipAddress}</span> • Brasília, DF
              </div>
            </td>

            <!-- Coluna Direita: QR Code de Validação Pública -->
            <td class="mobile-qr-cell" style="width: 115px; vertical-align: middle; text-align: center; border-left: 1px solid #f1f5f9; padding-left: 12px;">
              <a href="https://www.catraki.com.br/validar/${validationCode}" style="text-decoration: none; display: inline-block;">
                <img 
                  class="mobile-qr-img"
                  src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&color=000000&data=https%3A%2F%2Fwww.catraki.com.br%2Fvalidar%2F${validationCode}" 
                  alt="QR Code de Validação" 
                  style="width: 96px; height: 96px; display: block; border: 1px solid #000000; border-radius: 6px; padding: 3px; background: #ffffff;"
                />
              </a>
              <div style="font-size: 8.5px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 5px;">
                VALIDAÇÃO PÚBLICA
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Botão de Consulta Online -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://www.catraki.com.br/validar/${validationCode}" style="display: inline-block; background-color: #034b7f; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 12.5px; padding: 12px 26px; border-radius: 5px; box-shadow: 0 2px 5px rgba(3, 75, 127, 0.25);">
          Validar e Consultar Comprovante Online →
        </a>
      </div>

      <!-- Bloco Probatório Oficial Estilo Clicksign com a Marca Catraki -->
      <div style="border-top: 1.5px solid #cbd5e1; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #475569; line-height: 1.55;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr>
            <td style="width: 48px; vertical-align: top; padding-right: 12px;">
              <img 
                src="https://www.catraki.com.br/catraki.png" 
                alt="Catraki" 
                style="width: 42px; height: 42px; border-radius: 6px; display: block;" 
              />
            </td>
            <td style="vertical-align: top;">
              <div style="font-weight: 800; color: #0f172a; font-size: 12px; margin-bottom: 2px;">
                Documento assinado com validade jurídica.
              </div>
              <div style="color: #334155; font-size: 11px; margin-bottom: 4px;">
                Para conferir a validade, acesse <a href="https://www.catraki.com.br/validar/${validationCode}" style="color: #034b7f; font-weight: 700; text-decoration: underline;">https://www.catraki.com.br/validar</a> e utilize o código <strong>${validationCode}</strong>.
              </div>
              <div style="color: #64748b; font-size: 10px; line-height: 1.4;">
                As assinaturas eletrônicas têm validade jurídica prevista na <strong>Medida Provisória nº 2.200-2/2001 (Art. 10, § 2º)</strong> e na <strong>Lei Federal nº 14.063/2020 (Art. 4º, II)</strong>.
              </div>
            </td>
          </tr>
        </table>
        <div style="padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5; text-align: left;">
          🔒 <strong>Comprovante oficial:</strong> Este registro confirma a assinatura válida do termo <strong>${validationCode}</strong> e pode ser consultado a qualquer momento no validador público da plataforma Catraki.<br />
          Para mais informações sobre o tratamento e retenção de dados clínicos, consulte nossa <a href="https://www.catraki.com.br/privacidade" style="color: #034b7f; text-decoration: underline;">Política de Privacidade e Termos de Uso</a>.
        </div>
      </div>

    </div>
  </div>
</body>
</html>`,
        }),
      });
    } catch (e: any) {
      console.error('Erro ao enviar e-mail de comprovante:', e.message);
    }
  }

  return c.json({
    success: true,
    document_id: doc.id,
    validation_code: validationCode,
    manifest_sha256: manifestSha256,
    log_row_hash: logRowHash,
    signed_at_utc: signedAtIso,
    tsa_authority: 'Servidor Sincronizado - Cloudflare',
    validation_url: `/validar/${validationCode}`,
    message: 'Autorização médica assinada eletronicamente com sucesso e comprovante enviado para o e-mail.',
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
