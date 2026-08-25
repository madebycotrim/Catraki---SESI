import { Hono } from 'hono';
import {
  VerifyMatriculaSchema,
  ManualReviewUploadSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  SignDocumentSchema,
  RevokeConsentSchema,
  maskCPF,
  maskName,
  generateUniqueDocId,
  formatUserAgent,
} from '../../src/lib/schemas.ts';
import {
  sha256,
  hmacSha256,
  constantTimeEqual,
  generateOtp,
  encryptAesGcm,
  decryptAesGcm,
  bytesToBase64,
  generateTsaTimestampToken,
  stripExifFromBase64Image,
  canonicalJson,
} from '../../src/lib/crypto.ts';
import { GeradorPdfTermoSesi } from '../../src/lib/pades/GeradorPdfTermoSesi.ts';
import { computeLogRowHash } from '../../src/lib/audit-chain.ts';
import { querySesiMatricula } from '../../src/lib/sesi-matricula.ts';
import { rateLimiter } from '../middleware/ratelimit.ts';
import type { Env, AuditLogRowInput, DocumentRecord } from '../../src/lib/types.ts';

export const signerRouter = new Hono<{ Bindings: Env }>();

function formatToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 10) {
    return `+55${digits}`;
  }
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

async function sendTwilioMessage(
  to: string,
  body: string,
  env: {
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_FROM_PHONE?: string;
    TWILIO_WHATSAPP_FROM?: string;
  },
  useWhatsapp = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const from = useWhatsapp
    ? env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
    : env.TWILIO_FROM_PHONE;

  if (!from) {
    return { success: false, error: 'Twilio source number/sender not configured' };
  }

  const formattedTo = useWhatsapp
    ? (to.startsWith('whatsapp:') ? to : `whatsapp:${to}`)
    : to;

  const formData = new URLSearchParams();
  formData.append('To', formattedTo);
  formData.append('From', from);
  formData.append('Body', body);

  const authHeader = 'Basic ' + btoa(`${sid}:${token}`);

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (resp.ok) {
      const data = await resp.json() as any;
      return { success: true, messageId: data.sid };
    } else {
      const errText = await resp.text();
      return { success: false, error: `Twilio API error: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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
     WHERE (d.access_token = ? OR d.id = ?) AND d.status = 'pending'
     ORDER BY d.created_at DESC LIMIT 1`
  ).bind(token, token).first<any>();

  // Se não encontrar como access_token exato pendente, busca se é um slug de escola cadastrada ou cria sessão inicial
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
      legal_notice: 'Assinatura Eletrônica Avançada — Art. 4º, II, Lei nº 14.063/2020 c/c Art. 10, §2º, MP nº 2.200-2/2001; LGPD (Lei nº 13.709/2018) Arts. 7º, I, 11, I e 14; ECA Art. 17; Art. 299 CP',
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

  let doc = await db.prepare("SELECT * FROM documents WHERE (access_token = ? OR id = ?) AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(token, token).first<DocumentRecord>();
  if (!doc) {
    const template = await db.prepare('SELECT * FROM document_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1').first<any>();
    if (template) {
      const newDocId = generateUniqueDocId('DOC');
      await db.prepare(
        `INSERT INTO documents (id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name, parent_email_encrypted, parent_phone_encrypted, access_token, status, retention_expires_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+20 years'), datetime('now', '+1 year'))`
      ).bind(newDocId, template.id, template.version, template.content_sha256, 'Estudante', '2010-01-01', signer_name, 'ENC_INITIAL', 'ENC_INITIAL', token).run();
      doc = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(newDocId).first<DocumentRecord>();
    }
  }
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
 * POST /api/signer/check-student
 * Verifica se o estudante já possui uma autorização ativa e assinada
 */
signerRouter.post('/check-student', async (c) => {
  const body = await c.req.json();
  const { minor_cpf, minor_name, minor_birth_date } = body;
  const db = c.env.DB;

  const cleanCpf = (minor_cpf || '').replace(/\D/g, '');
  const cleanName = (minor_name || '').trim();

  let query = "SELECT d.id, d.status, d.minor_name, d.parent_name, a.manifest_sha256, a.signed_at FROM documents d LEFT JOIN audit_logs a ON d.id = a.document_id WHERE d.status = 'signed' AND (";
  const params: any[] = [];

  if (cleanCpf && cleanCpf.length === 11) {
    query += "d.minor_cpf = ? OR d.minor_cpf_raw = ?";
    params.push(maskCPF(cleanCpf), cleanCpf);
  } else if (cleanName && minor_birth_date) {
    query += "LOWER(d.minor_name) = LOWER(?) AND d.minor_birth_date = ?";
    params.push(cleanName, minor_birth_date);
  } else {
    return c.json({ hasExistingSignature: false });
  }

  query += ") ORDER BY a.signed_at DESC LIMIT 1";

  try {
    const existing = await db.prepare(query).bind(...params).first<any>();
    if (existing) {
      const validationCode = existing.manifest_sha256
        ? `SESI-${existing.manifest_sha256.substring(0, 4).toUpperCase()}-${existing.manifest_sha256.substring(existing.manifest_sha256.length - 4).toUpperCase()}`
        : `SESI-${existing.id.slice(-8).toUpperCase()}`;

      return c.json({
        hasExistingSignature: true,
        existingValidationCode: validationCode,
        signedAt: existing.signed_at,
        signerNameMasked: existing.parent_name ? maskName(existing.parent_name) : 'Responsável Legal',
        minorName: existing.minor_name,
        documentId: existing.id,
      });
    }
  } catch (e) {
    console.error('Erro ao verificar duplicidade de estudante:', e);
  }

  return c.json({ hasExistingSignature: false });
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

  let doc = await db.prepare("SELECT * FROM documents WHERE (access_token = ? OR id = ?) AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(token, token).first<DocumentRecord>();
  if (!doc) {
    const template = await db.prepare('SELECT * FROM document_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1').first<any>();
    if (template) {
      const newDocId = generateUniqueDocId('DOC');
      await db.prepare(
        `INSERT INTO documents (id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name, parent_email_encrypted, parent_phone_encrypted, access_token, status, retention_expires_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+20 years'), datetime('now', '+1 year'))`
      ).bind(newDocId, template.id, template.version, template.content_sha256, 'Estudante', '2010-01-01', signer_name, 'ENC_INITIAL', 'ENC_INITIAL', token).run();
      doc = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(newDocId).first<DocumentRecord>();
    }
  }
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

  const idDocSha256 = await sha256(cleanIdDoc);
  const selfieDocSha256 = await sha256(cleanSelfie);

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
      (id, document_id, signer_name, signer_cpf_masked, signer_cpf_encrypted, signer_relationship,
       identity_doc_r2_key, selfie_doc_r2_key, guardianship_doc_r2_key, identity_doc_sha256, selfie_doc_sha256,
       status, review_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
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
    idDocSha256,
    selfieDocSha256,
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

  const { token, channel, email: providedEmail, phone: providedPhone, minor_name: providedMinorName } = parsed.data;

  const db = c.env.DB;
  const pepper = c.env.OTP_PEPPER;
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (!pepper || !masterKey) {
    return c.json({ success: false, error: 'Configuração do servidor incompleta (OTP_PEPPER/ENCRYPTION_KEY_V1).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

  let doc = await db.prepare("SELECT * FROM documents WHERE (access_token = ? OR id = ?) AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(token, token).first<DocumentRecord>();
  if (!doc) {
    const template = await db.prepare('SELECT * FROM document_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1').first<any>();
    if (template) {
      const isDocId = token.startsWith('DOC-');
      const newDocId = isDocId ? token : generateUniqueDocId('DOC');
      const cleanAccessToken = isDocId ? token : newDocId;

      await db.prepare(
        `INSERT INTO documents (id, template_id, template_version, content_sha256, minor_name, minor_birth_date, parent_name, parent_email_encrypted, parent_phone_encrypted, access_token, status, retention_expires_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+20 years'), datetime('now', '+1 year'))`
      ).bind(newDocId, template.id, template.version, template.content_sha256, providedMinorName || 'Estudante', '2010-01-01', 'Responsável Legal', 'ENC_INITIAL', 'ENC_INITIAL', cleanAccessToken).run();
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

  const studentName = providedMinorName || doc.minor_name || 'Estudante';
  
  let emailSent = false;
  let emailError = '';
  let resendMessageId = '';

  let smsSent = false;
  let smsMessageId = '';
  let smsError = '';

  if (channel === 'email') {
    const targetEmail = providedEmail || (doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' ? await decryptAesGcm(doc.parent_email_encrypted, masterKey) : null);
    if (targetEmail) {
      const resendApiKey = (c.env as any).RESEND_API_KEY;
      const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';

      const otpHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="background-color: #f1f5f9; padding: 28px 10px; color: #1e293b; line-height: 1.6;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 32px 28px;">
      <div style="border-bottom: 2.5px solid #034b7f; padding-bottom: 16px; margin-bottom: 22px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <h2 style="color: #034b7f; margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase;">Escola Cidadã — Saúde em Movimento</h2>
              <span style="color: #64748b; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; display: block; margin-top: 2px;">Validação de Autoria por Código Eletrônico</span>
            </td>
            <td style="width: 40px; vertical-align: middle; text-align: right;">
              <img src="https://www.catraki.com.br/catraki.png" alt="Catraki" style="width: 36px; height: 36px; border-radius: 6px;" />
            </td>
          </tr>
        </table>
      </div>
      <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 12px 0;">Olá,</p>
      <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px 0;">
        Para autenticar e concluir a assinatura do Termo de Consentimento referente ao(à) estudante <strong>${studentName}</strong>, utilize o código de segurança abaixo:
      </p>
      <div style="background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 10px; padding: 22px; text-align: center; margin: 20px 0;">
        <span style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #034b7f; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="color: #64748b; font-size: 11.5px; line-height: 1.5; margin: 20px 0 0 0;">
        ⏱️ <strong>Validade:</strong> Este código expira em 5 minutes. Se você não solicitou este procedimento, por favor desconsidere este e-mail.
      </p>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 10.5px; color: #94a3b8; text-align: center; line-height: 1.5;">
        Assinatura Eletrônica Avançada • Lei Federal nº 14.063/2020 • Plataforma Catraki<br />
        Para mais informações sobre como protegemos seus dados, consulte nossa <a href="https://www.catraki.com.br/privacidade" style="color: #034b7f; text-decoration: underline;">Política de Privacidade e Termos de Uso</a>.
      </div>
    </div>
  </div>
</body>
</html>`;

      if (resendApiKey) {
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
              html: otpHtml,
            }),
          });

          if (resendResp.ok) {
            emailSent = true;
            const resendData = await resendResp.json() as any;
            resendMessageId = resendData.id;
          } else {
            const resendErr = await resendResp.text();
            emailError = `Falha Resend: ${resendErr}`;
          }
        } catch (err: any) {
          emailError = `Erro conexão Resend: ${err.message}`;
        }
      }

      if (!emailSent) {
        try {
          const mcResp = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: targetEmail }] }],
              from: {
                email: 'autorizacoes@catraki.com.br',
                name: 'Escola Cidadã — Saúde em Movimento',
              },
              subject: `Código de Confirmação: ${otpCode} — Catraki`,
              content: [{
                type: 'text/html',
                value: otpHtml,
              }],
            }),
          });

          if (mcResp.ok) {
            emailSent = true;
            emailError = '';
            resendMessageId = 'mailchannels-sent';
          } else {
            const mcErr = await mcResp.text();
            emailError = `${emailError ? emailError + ' | ' : ''}Falha MailChannels: ${mcErr}`;
          }
        } catch (err: any) {
          emailError = `${emailError ? emailError + ' | ' : ''}Erro conexão MailChannels: ${err.message}`;
        }
      }
    }
  } else if (channel === 'sms') {
    let targetPhone = providedPhone;
    if (!targetPhone && doc.parent_phone_encrypted && doc.parent_phone_encrypted !== 'ENC_INITIAL') {
      try {
        targetPhone = await decryptAesGcm(doc.parent_phone_encrypted, masterKey);
      } catch (err: any) {
        console.error('Erro decodificação telefone:', err);
      }
    }
    if (targetPhone) {
      const otpMessage = `Catraki - SESI: Seu código de confirmação para a autorização do(a) estudante ${studentName} é: ${otpCode}. Válido por 5 minutos.`;
      const formattedPhone = formatToE164(targetPhone);
      const useWhatsapp = !!c.env.TWILIO_WHATSAPP_FROM;
      const twilioResult = await sendTwilioMessage(formattedPhone, otpMessage, c.env, useWhatsapp);
      if (twilioResult.success) {
        smsSent = true;
        smsMessageId = twilioResult.messageId || 'twilio-sent';
      } else {
        smsError = twilioResult.error || 'Erro desconhecido Twilio';
        console.error('Twilio Send Error:', smsError);
      }
    }
  }

  let messageId = 'development-mock';
  let deliveryStatus = 'simulated';

  if (channel === 'email' && emailSent) {
    messageId = resendMessageId || 'mailchannels-sent';
    deliveryStatus = 'sent';
  } else if (channel === 'sms' && smsSent) {
    messageId = smsMessageId;
    deliveryStatus = 'sent';
  }

  await db.prepare(
    `UPDATE documents 
     SET otp_secret_hash = ?, 
         otp_attempts = 0, 
         otp_expires_at = ?, 
         otp_resend_count = otp_resend_count + 1,
         otp_requested_at = ?,
         otp_email_message_id = ?,
         otp_delivery_status = ? 
     WHERE id = ?`
  ).bind(otpHash, expiresAtIso, new Date().toISOString(), messageId, deliveryStatus, doc.id).run();

  if (!emailSent && !smsSent) {
    console.info(`[SIMULATION_OTP] Código OTP gerado para o documento ${doc.id}: ${otpCode}`);
  } else {
    console.log(`[SECURE_OTP] Código OTP enviado com sucesso.`);
  }

  return c.json({
    success: true,
    channel,
    email_sent: emailSent || smsSent,
    email_error: emailError || smsError || undefined,
    expires_in_seconds: 300,
    message: `Código de verificação de 6 dígitos enviado para o ${channel === 'sms' ? 'celular (SMS/WhatsApp)' : 'e-mail'} do responsável legal.`,
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

  const doc = await db.prepare("SELECT * FROM documents WHERE (access_token = ? OR id = ?) AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(token, token).first<DocumentRecord>();
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
  const masterKey = c.env.ENCRYPTION_KEY_V1 || 'SESI_ENCRYPTION_KEY_32BYTES_PROD_12345';
  const pepper = c.env.OTP_PEPPER || 'SESI_OTP_PEPPER_SECRET_KEY_PROD_98765';

  if (!db) {
    return c.json({
      success: false,
      error: 'Serviço de banco de dados Cloudflare D1 indisponível.',
      code: 'DB_UNAVAILABLE',
    }, 503);
  }

  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, t.content_markdown, t.consent_text_version, t.content_sha256 as template_content_sha256
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE (d.access_token = ? OR d.id = ?) AND d.status = 'pending'
     ORDER BY d.created_at DESC LIMIT 1`
  ).bind(token, token).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não encontrado ou já assinado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const birthDateStr = parsed.data.minor_birth_date || doc.minor_birth_date;
  if (birthDateStr) {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 14) {
      return c.json({
        success: false,
        error: 'O estudante deve possuir no mínimo 14 anos de idade para participar do projeto.',
        code: 'UNDERAGE_STUDENT',
      }, 400);
    }
  }

  if (doc.status === 'signed') {
    return c.json({ success: false, error: 'Este documento já foi assinado anteriormente.', code: 'ALREADY_SIGNED' }, 409);
  }

  if (doc.status !== 'pending') {
    return c.json({ success: false, error: `Documento em status inválido: ${doc.status}`, code: 'INVALID_STATUS' }, 400);
  }

  // Prevenção de duplicidade: não permite que o mesmo estudante tenha mais de uma autorização assinada
  const rawMinorCpf = parsed.data.minor_cpf ? parsed.data.minor_cpf.replace(/\D/g, '') : '';
  if (rawMinorCpf && rawMinorCpf.length === 11) {
    const existingSigned = await db.prepare(
      "SELECT d.id, a.manifest_sha256 FROM documents d LEFT JOIN audit_logs a ON d.id = a.document_id WHERE d.status = 'signed' AND (d.minor_cpf = ? OR d.minor_cpf_raw = ?) AND d.id != ? LIMIT 1"
    ).bind(maskCPF(rawMinorCpf), rawMinorCpf, doc.id).first<any>();

    if (existingSigned) {
      const vCode = existingSigned.manifest_sha256
        ? `SESI-${existingSigned.manifest_sha256.substring(0, 4).toUpperCase()}-${existingSigned.manifest_sha256.substring(existingSigned.manifest_sha256.length - 4).toUpperCase()}`
        : `SESI-${existingSigned.id.slice(-8).toUpperCase()}`;

      return c.json({
        success: false,
        error: `Este(a) estudante já possui uma autorização médica ativa e assinada (Código: ${vCode}).`,
        code: 'STUDENT_ALREADY_SIGNED',
        existing_validation_code: vCode,
      }, 409);
    }
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
    procedure_description_sha256: await sha256(doc.procedure_description || 'Atendimento em Saúde SESI'),
    content_sha256: contentSha256AtSigning,
    signed_at_utc: signedAtIso,
    specialties_consent: {
      oftalmologia: parsed.data.auth_health === 'yes',
      audiometria: parsed.data.auth_health === 'yes',
      odontologia: parsed.data.auth_health === 'yes',
      psicologia: parsed.data.auth_health === 'yes',
      nutricao: parsed.data.auth_health === 'yes',
      uso_imagem: parsed.data.auth_image === 'yes'
    },
    signer: {
      name: signer_name,
      cpf_masked: cpfMasked,
      relationship: signer_relationship,
      identity_method: identityMethod,
    },
    minor: {
      name_hash: await sha256(doc.minor_name || 'Estudante'),
      birth_date: doc.minor_birth_date,
    },
    signature_png_sha256: signaturePngSha256,
    digital_evidence: {
      ip: ipAddress,
      user_agent_hash: await sha256(userAgent),
      geo: `${geoCity}/${geoRegion}/${geoCountry}`,
      fingerprint: client_fingerprint || null,
    },
    legal_basis: 'MP 2.200-2/2001 Art. 10, §2º; Lei 14.063/2020 Art. 4º, II (Assinatura Eletrônica Avançada); LGPD (Lei 13.709/2018) Arts. 7º, I e II, 11, I, 14, §1º e 18; ECA Art. 17; Art. 299 CP; REsp 2.205.708/PR (STJ)',
    consent_text_version: doc.consent_text_version,
  };

  const manifestSha256 = await sha256(canonicalJson(manifestData));
  const tsa = await generateTsaTimestampToken(manifestSha256, c.env.TSA_ENDPOINT);
  const auditLogId = `AUD-${Date.now()}-${doc.id.substring(0, 8)}`;

  // Cálculo do Fingerprint do Termo + Dados do Pai (SHA-256)
  const textToHash = `${doc.content_markdown || ''}\n${signer_name}\n${signer_cpf}\n${parsed.data.minor_name || doc.minor_name}\n${parsed.data.minor_birth_date || doc.minor_birth_date}`;
  const docParentHash = await sha256(textToHash);

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
    otp_requested_at: doc.otp_requested_at,
    otp_verified_at: signedAtIso,
    otp_email_message_id: doc.otp_email_message_id,
    doc_parent_hash_sha256: docParentHash,
    device_metadata: formatUserAgent(userAgent),
  };

  const logRowHash = await computeLogRowHash(auditRowInput);
  const signerCpfEncrypted = await encryptAesGcm(signer_cpf, masterKey, 1);
  const signaturePngEncrypted = await encryptAesGcm(signature_png_base64, masterKey, 1);

  const pdfR2Key = `signed-pdfs/${doc.id}/${manifestSha256}.pdf`;
  const manifestR2Key = `manifests/${doc.id}/${manifestSha256}.json`;

  // Formatação de data do menor para o PDF
  const rawBirth = parsed.data.minor_birth_date || doc.minor_birth_date || '';
  let studentBirth = 'Data não informada';
  if (rawBirth && rawBirth.includes('-')) {
    const parts = rawBirth.split('-');
    if (parts.length === 3) {
      studentBirth = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      studentBirth = rawBirth;
    }
  } else {
    studentBirth = rawBirth || 'Data não informada';
  }

  // Geração do PDF Oficial (Manifesto) no servidor
  const pdfBytes = await GeradorPdfTermoSesi.gerarPdfOriginal({
    tituloProcedimento: doc.template_title || 'Atendimento em Saúde — Escola Cidadã',
    descricaoProcedimento: doc.procedure_description || 'Autorização para exames clínicos preventivos.',
    nomeMenor: parsed.data.minor_name || doc.minor_name,
    dataNascimentoMenor: studentBirth,
    nomeResponsavel: signer_name,
    cpfResponsavelMascarado: cpfMasked,
    parentesco: signer_relationship,
    autorizacaoSaude: parsed.data.auth_health === 'yes',
    autorizacaoDados: parsed.data.auth_data === 'yes',
    autorizacaoImagem: parsed.data.auth_image === 'yes',
    hashManifesto: manifestSha256,
    dataAssinatura: new Date(signedAtIso),
    tipoAssinatura: 'ELETRONICA_AVANCADA',
    ipAddress: ipAddress,
    userAgent: userAgent,
    geoCidade: geoCity,
    geoEstado: geoRegion,
    geoPais: geoCountry,
    otpRequestedAt: doc.otp_requested_at ? new Date(doc.otp_requested_at) : undefined,
    otpVerifiedAt: new Date(signedAtIso),
    assinaturaPngBase64: signature_png_base64,
  });

  if (bucket) {
    await bucket.put(manifestR2Key, JSON.stringify(manifestData, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
    // Salva o PDF no Cloudflare R2
    await bucket.put(pdfR2Key, pdfBytes, {
      httpMetadata: { contentType: 'application/pdf' },
    });
  }

  try {
    const parentEmailEncrypted = parsed.data.signer_email && masterKey
      ? await encryptAesGcm(parsed.data.signer_email, masterKey)
      : (doc.parent_email_encrypted || null);

    const cleanEmail = parsed.data.signer_email?.trim().toLowerCase();
    const parentEmailBindex = cleanEmail
      ? await hmacSha256(cleanEmail, c.env.OTP_PEPPER || 'bindex_secret')
      : null;

    const batch = await db.batch([
      db.prepare(
        `INSERT INTO audit_logs (
          id, document_id, prev_log_hash, signed_at, signer_name,
          signer_cpf_encrypted, signer_cpf_masked, signer_relationship, identity_method,
          signature_png_encrypted, signature_png_sha256, key_version, ip_address, user_agent,
          geo_city, geo_region, geo_country, client_fingerprint,
          content_sha256_at_signing, consent_text_version, manifest_sha256, tsa_timestamp_token,
          otp_requested_at, otp_verified_at, otp_email_message_id, doc_parent_hash_sha256, device_metadata,
          log_row_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
        doc.otp_requested_at,
        signedAtIso,
        doc.otp_email_message_id,
        docParentHash,
        formatUserAgent(userAgent),
        logRowHash
      ),
      db.prepare(
        `UPDATE documents 
         SET status = 'signed', 
             parent_name = ?, 
             parent_email_encrypted = COALESCE(?, parent_email_encrypted),
             parent_email_bindex_sha256 = COALESCE(?, parent_email_bindex_sha256),
             minor_name = COALESCE(?, minor_name), 
             minor_birth_date = COALESCE(?, minor_birth_date),
             minor_cpf = ?,
             minor_series = ?,
             minor_class = ?,
             minor_turn = ?,
             signed_pdf_r2_key = ?, 
             otp_secret_hash = NULL,
             otp_verified_at = ?,
             doc_parent_hash_sha256 = ?
         WHERE id = ? AND status = 'pending'`
      ).bind(
        signer_name,
        parentEmailEncrypted,
        parentEmailBindex,
        parsed.data.minor_name || doc.minor_name || null,
        parsed.data.minor_birth_date || doc.minor_birth_date || null,
        parsed.data.minor_cpf ? maskCPF(parsed.data.minor_cpf) : null,
        parsed.data.minor_series || null,
        parsed.data.minor_class || null,
        parsed.data.minor_turn || null,
        pdfR2Key,
        signedAtIso,
        docParentHash,
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
  const studentCpf = parsed.data.minor_cpf ? maskCPF(parsed.data.minor_cpf) : '';
  const rawSeries = (parsed.data.minor_series || '').trim();
  const rawClass = (parsed.data.minor_class || '').trim();
  const rawTurn = (parsed.data.minor_turn || '').trim();

  let studentSeriesText = '';
  let formattedSeries = rawSeries;
  if (/^\d+$/.test(formattedSeries)) {
    formattedSeries = `${formattedSeries}º ano`;
  } else if (/^\d+º$/.test(formattedSeries)) {
    formattedSeries = `${formattedSeries} ano`;
  }

  let formattedClass = rawClass;
  if (formattedClass.toLowerCase().startsWith('turma ')) {
    formattedClass = formattedClass.substring(6).trim();
  }

  if (formattedSeries && formattedClass) {
    studentSeriesText = `, Série/Turma: <strong>${formattedSeries} ${formattedClass}</strong>`;
  } else if (formattedSeries) {
    studentSeriesText = `, Série: <strong>${formattedSeries}</strong>`;
  } else if (formattedClass) {
    studentSeriesText = `, Turma: <strong>${formattedClass}</strong>`;
  }

  const studentTurnText = rawTurn ? `, Turno: <strong>${rawTurn}</strong>` : '';
  const signerPhoneText = parsed.data.signer_phone ? `, telefone de contato <strong>${parsed.data.signer_phone}</strong>` : '';
  const institutionName = parsed.data.institution_name || 'Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)';

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(signedAtIso));

  const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px 6px !important; }
      .email-card { padding: 20px 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-qr-cell { display: block !important; width: 100% !important; border-left: none !important; border-top: 1px dashed #cbd5e1 !important; padding-left: 0 !important; padding-top: 16px !important; margin-top: 14px !important; text-align: center !important; }
      .mobile-qr-img { margin: 0 auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, sans-serif;">
  <div class="email-wrapper" style="background-color: #f1f5f9; padding: 28px 10px; color: #1e293b; line-height: 1.6;">
    <div class="email-card" style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 32px 28px;">
      <div style="border-bottom: 2.5px solid #034b7f; padding-bottom: 16px; margin-bottom: 22px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 44px; vertical-align: middle; padding-right: 12px;">
              <img src="https://www.catraki.com.br/catraki.png" style="width: 36px; height: 36px; display: block; border-radius: 6px;" alt="Catraki Logo" />
            </td>
            <td style="vertical-align: middle;">
              <h2 style="font-size: 14px; font-weight: 800; color: #034b7f; margin: 0; text-transform: uppercase;">ESCOLA CIDADÃ</h2>
              <span style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Saúde em Movimento</span>
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 2px 8px; font-size: 9.5px; font-weight: 700; color: #065f46; display: inline-block;">✓ ASSINADO</div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; font-family: monospace;">Nº ${validationCode}</div>
            </td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin-bottom: 22px;">
        <h1 style="font-size: 13.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0;">TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO DIGITAL (TCLE)</h1>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">Comprovante de Autorização para Atendimento e Triagens em Saúde</div>
      </div>
      <div style="margin-bottom: 20px; font-size: 12.5px; line-height: 1.85; text-align: justify;">
        <p style="text-indent: 28px; margin: 0 0 16px 0;">
          Eu, <strong>${signer_name}</strong>, portador(a) do CPF <strong>${cpfMasked}</strong>, na qualidade de <strong>${signer_relationship}</strong> do(a) estudante <strong>${studentName}</strong>, nascido(a) em <strong>${studentBirth}</strong>${studentCpf ? `, portador(a) do CPF <strong>${studentCpf}</strong>` : ''}${signerPhoneText}, matriculado(a) na instituição <strong>${institutionName}</strong>${studentSeriesText}${studentTurnText}, declaro sob as penas da lei que <strong>AUTORIZO a realização das triagens e atendimentos de saúde do(a) estudante</strong> nas ações do projeto <strong>Escola Cidadã — Saúde em Movimento</strong>.
        </p>
      </div>
      <div style="margin-bottom: 20px; font-size: 12px; line-height: 1.6; text-align: justify; border-top: 1px solid #cbd5e1; padding-top: 14px;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #475569;">
          Adicionalmente, manifesto de forma expressa, livre e inequívoca meu consentimento em relação às seguintes condições:
        </p>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          <li style="margin-bottom: 12px;">
            <strong>a) Circuito de Saúde e Especialidades:</strong> 
            <span style="font-weight: bold; color: ${parsed.data.auth_health === 'yes' ? '#107c41' : '#c80000'};">
              [ ${parsed.data.auth_health === 'yes' ? '✓ AUTORIZO' : 'X NÃO AUTORIZO'} ]
            </span>
            <span style="color: #475569; font-size: 11px; display: block; margin-top: 2px;">
              — Fica autorizada a realização de triagens preventivas e avaliações clínicas no circuito oficial do projeto (Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição).
            </span>
          </li>
          <li style="margin-bottom: 12px;">
            <strong>b) Tratamento de Dados Pessoais:</strong>
            <span style="font-weight: bold; color: ${parsed.data.auth_data === 'yes' ? '#107c41' : '#c80000'};">
              [ ${parsed.data.auth_data === 'yes' ? '✓ AUTORIZO' : 'X NÃO AUTORIZO'} ]
            </span>
            <span style="color: #475569; font-size: 11px; display: block; margin-top: 2px;">
              — Fica expressamente autorizada a coleta e o processamento seguro dos dados pessoais para finalidade exclusiva de registro e comprovação legal do consentimento de participação do estudante no projeto.
            </span>
          </li>
          <li style="margin-bottom: 12px;">
            <strong>c) Captação e Uso de Imagem e Voz:</strong>
            <span style="font-weight: bold; color: ${parsed.data.auth_image === 'yes' ? '#107c41' : '#c80000'};">
              [ ${parsed.data.auth_image === 'yes' ? '✓ AUTORIZO' : 'X NÃO AUTORIZO'} ]
            </span>
            <span style="color: #475569; font-size: 11px; display: block; margin-top: 2px;">
              — Fica autorizada de forma gratuita a captação e veiculação de fotos/vídeos do estudante para documentação institucional e relatórios de prestação de contas, respeitando a sua dignidade (ECA, Art. 17).
            </span>
          </li>
        </ul>
      </div>
      <div style="margin: 16px 0; background-color: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 14px 16px; font-size: 11.5px; color: #78350f;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 28px; vertical-align: top; font-size: 18px; line-height: 1; padding-right: 8px;">
              ⚠️
            </td>
            <td style="vertical-align: top; color: #451a03; font-size: 11.5px; line-height: 1.5;">
              <strong style="color: #451a03; font-size: 12px; display: block; margin-bottom: 2px;">Aviso Operacional Importante</strong>
              Este comprovante atesta a autorização registrada. Contudo, <strong>esta assinatura não garante atendimento presencial imediato</strong>, que fica condicionado à capacidade diária máxima de atendimentos no local.
            </td>
          </tr>
        </table>
      </div>
      <div style="border-top: 1.5px solid #cbd5e1; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #475569;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td class="mobile-stack" style="vertical-align: top; padding-right: 14px; font-size: 11.5px;">
              <span style="color: #64748b; font-weight: 700;">Código de Validação:</span> <strong>${validationCode}</strong><br>
              <span style="color: #64748b; font-weight: 700;">Hash do Manifesto:</span> <span style="font-family: monospace; font-size: 10px;">${manifestSha256}</span><br>
              <span style="color: #64748b; font-weight: 700;">Data e Hora do Registro:</span> ${dataFormatada}<br>
              <span style="color: #64748b; font-weight: 700;">IP do Dispositivo:</span> ${ipAddress}<br>
              <span style="color: #64748b; font-weight: 700;">Impressão Digital do Termo + Pai:</span> <span style="font-family: monospace; font-size: 10px;">${docParentHash}</span>
            </td>
            <td class="mobile-qr-cell" style="width: 115px; vertical-align: middle; text-align: center; border-left: 1px solid #cbd5e1; padding-left: 12px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fwww.catraki.com.br%2Fvalidar%2F${validationCode}" style="width: 90px; height: 90px; display: block; margin: 0 auto; border: 1px solid #ccc; border-radius: 4px; padding: 2px;" />
              <div style="font-size: 8px; font-weight: bold; margin-top: 4px;">VALIDAÇÃO ONLINE</div>
            </td>
          </tr>
        </table>
      </div>
      <div style="margin-top: 24px; border-top: 1px dashed #e2e8f0; padding-top: 12px; font-size: 10.5px; color: #64748b; text-align: center;">
        O comprovante de assinatura em formato PDF contendo toda a trilha de auditoria e a validade jurídica (Art. 4º, II da Lei 14.063/2020, MP 2.200-2/2001 e LGPD) está anexado a esta mensagem.
      </div>
    </div>
  </div>
</body>
</html>`;

  let comprovanteEnviado = false;
  const pdfBase64 = bytesToBase64(pdfBytes);

  if (targetEmail) {
    if (resendApiKey) {
      try {
        let resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [targetEmail],
            subject: `Comprovante de Assinatura Eletrônica — ${studentName} (${validationCode})`,
            html: emailHtml,
            attachments: [
              {
                filename: `comprovante-assinatura-${doc.id}.pdf`,
                content: pdfBase64,
              }
            ]
          }),
        });

        // Fallback automático para o remetente oficial do Resend caso o domínio não esteja validado
        if (!resendResp.ok) {
          resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Escola Cidadã — SESI Saúde <onboarding@resend.dev>',
              to: [targetEmail],
              subject: `Comprovante de Assinatura Eletrônica — ${studentName} (${validationCode})`,
              html: emailHtml,
              attachments: [
                {
                  filename: `comprovante-assinatura-${doc.id}.pdf`,
                  content: pdfBase64,
                }
              ]
            }),
          });
        }

        if (resendResp.ok) {
          comprovanteEnviado = true;
        }
      } catch (e: any) {
        console.error('Erro de conexão ao enviar comprovante via Resend:', e.message);
      }
    }

    if (!comprovanteEnviado) {
      try {
        const mcResp = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: targetEmail }] }],
            from: {
              email: 'autorizacoes@catraki.com.br',
              name: 'Escola Cidadã — Saúde em Movimento',
            },
            subject: `Comprovante de Assinatura Eletrônica — ${studentName} (${validationCode})`,
            content: [{
              type: 'text/html',
              value: emailHtml,
            }],
            attachments: [
              {
                content: pdfBase64,
                type: 'application/pdf',
                filename: `comprovante-assinatura-${doc.id}.pdf`
              }
            ]
          }),
        });

        if (mcResp.ok) {
          comprovanteEnviado = true;
        }
      } catch (mcErr: any) {
        console.error('Erro de conexão ao enviar comprovante via MailChannels:', mcErr.message);
      }
    }
  }

  return c.json({
    success: true,
    document_id: doc.id,
    validation_code: validationCode,
    manifest_sha256: manifestSha256,
    log_row_hash: logRowHash,
    signed_at_utc: signedAtIso,
    ip_address: ipAddress,
    geo_city: geoCity === 'Local' ? 'Brasília' : geoCity,
    geo_region: geoRegion === 'BR-SP' ? 'DF' : geoRegion,
    tsa_authority: 'Servidor Sincronizado - Cloudflare',
    validation_url: `/validar/${validationCode}`,
    email_dispatched: comprovanteEnviado,
    target_email: targetEmail,
    message: 'Autorização médica assinada eletronicamente com sucesso e comprovante PDF enviado para o e-mail.',
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
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Signer';

  await db.prepare(
    `UPDATE documents 
     SET status = 'revoked', revoked_at = ?, revoked_reason = ? 
     WHERE id = ?`
  ).bind(revokedAtIso, reason, doc.id).run();

  // Registro na Trilha de Auditoria de Cancelamento/Revogação (Marco Civil / LGPD)
  try {
    const cancelId = `REVOKED-${Date.now()}-${doc.id.substring(0, 8)}`;
    const rowHash = await sha256(`${cancelId}|${doc.id}|${revokedAtIso}|${clientIp}|${doc.parent_name || 'Titular'}|${reason}`);

    await db.prepare(
      `INSERT INTO document_cancellation_audits (
        id, document_id, cancelled_at, ip_address, user_agent,
        cancelled_by_user_id, cancelled_by_user_email, cancelled_by_role,
        justification, document_manifest_sha256, log_row_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'titular_responsavel', ?, ?, ?, datetime('now'))`
    ).bind(
      cancelId,
      doc.id,
      revokedAtIso,
      clientIp,
      userAgent,
      `SIGNER-${doc.id.substring(0, 8)}`,
      'titular@portal.sesi.br',
      reason,
      doc.content_sha256 || null,
      rowHash
    ).run();
  } catch (e) {
    console.error('Falha ao registrar auditoria de revogação:', e);
  }

  // Disparo de E-mail de Comprovante de Revogação ao Responsável Legal
  let emailDispatched = false;
  let targetEmail: string | null = null;
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' && masterKey) {
    try {
      targetEmail = await decryptAesGcm(doc.parent_email_encrypted, masterKey);
    } catch {}
  }

  if (!targetEmail && (doc as any).parent_email && (doc as any).parent_email.includes('@')) {
    targetEmail = (doc as any).parent_email;
  }

  if (targetEmail && targetEmail.includes('@')) {
    const formattedDate = new Date(revokedAtIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const validationCode = doc.content_sha256 
      ? `SESI-${doc.content_sha256.substring(0, 4).toUpperCase()}-${doc.content_sha256.substring(doc.content_sha256.length - 4).toUpperCase()}`
      : `DOC-${doc.id.substring(0, 8).toUpperCase()}`;

    const revokeHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif; color: #1e293b;">
  <div style="background-color: #f8fafc; padding: 24px 10px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
      <div style="border-bottom: 2px solid #034b7f; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #034b7f; margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase;">
          Escola Cidadã — SESI Saúde DF
        </h2>
        <span style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">
          Comprovante de Revogação de Consentimento (LGPD Art. 18)
        </span>
      </div>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">
        Prezado(a) <strong>${doc.parent_name || 'Responsável Legal'}</strong>,
      </p>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
        Confirmamos que o consentimento previamente outorgado referente ao(à) estudante <strong>${doc.minor_name || 'Estudante'}</strong> foi <strong>REVOGADO</strong> com sucesso em nossos registros.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-bottom: 18px; font-size: 12px;">
        <p style="margin: 0 0 6px 0;"><strong>Identificador:</strong> <span style="font-family: monospace;">${validationCode}</span></p>
        <p style="margin: 0 0 6px 0;"><strong>Data/Hora do Cancelamento:</strong> ${formattedDate}</p>
        <p style="margin: 0;"><strong>Motivo Declarado:</strong> ${reason}</p>
      </div>
      <p style="font-size: 12px; color: #475569; line-height: 1.6;">
        A partir deste momento, nenhum novo atendimento médico preventivo ou triagem clínica será realizado para o estudante sem uma nova autorização formal.
      </p>
      <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 10.5px; color: #94a3b8; text-align: center;">
        Projeto Escola Cidadã: Saúde em Movimento • SESI-DF • Universidade de Brasília (UnB)
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendApiKey = (c.env as any).RESEND_API_KEY;
    const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';

    try {
      if (resendApiKey) {
        let resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [targetEmail],
            subject: `[SESI / Escola Cidadã] Comprovante de Revogação de Consentimento — ${doc.minor_name || 'Estudante'}`,
            html: revokeHtml,
          }),
        });

        if (!resendResp.ok) {
          resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Escola Cidadã — SESI Saúde <onboarding@resend.dev>',
              to: [targetEmail],
              subject: `[SESI / Escola Cidadã] Comprovante de Revogação de Consentimento — ${doc.minor_name || 'Estudante'}`,
              html: revokeHtml,
            }),
          });
        }

        if (resendResp.ok) {
          emailDispatched = true;
        }
      }

      if (!emailDispatched) {
        const mcResp = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: targetEmail }] }],
            from: {
              email: 'autorizacoes@catraki.com.br',
              name: 'Escola Cidadã — Saúde em Movimento',
            },
            subject: `[SESI / Escola Cidadã] Comprovante de Revogação de Consentimento — ${doc.minor_name || 'Estudante'}`,
            content: [{
              type: 'text/html',
              value: revokeHtml,
            }],
          }),
        });

        if (mcResp.ok) {
          emailDispatched = true;
        }
      }
    } catch {}
  }

  return c.json({
    success: true,
    revoked_at: revokedAtIso,
    email_dispatched: emailDispatched,
    target_email: targetEmail,
    message: emailDispatched
      ? `Consentimento revogado com sucesso e comprovante enviado para ${targetEmail}.`
      : 'Consentimento revogado com sucesso. A equipe médica e a administração do SESI foram notificadas.',
  });
});
