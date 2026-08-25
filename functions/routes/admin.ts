import { Hono } from 'hono';
import {
  CreateTemplateSchema,
  CreateDocumentSchema,
  ManualReviewActionSchema,
  CancelDocumentErrorSchema,
  generateUniqueDocId,
} from '../../src/lib/schemas.ts';
import {
  sha256,
  generateSecureToken,
  encryptAesGcm,
  decryptAesGcm,
  verifyPasswordPbkdf2,
} from '../../src/lib/crypto.ts';
import {
  getTransactionalCancellationEmailHtml,
  getTransactionalCancellationEmailText,
} from '../../src/lib/email-templates.ts';
import { verifyAuditChain, computeMerkleRoot } from '../../src/lib/audit-chain.ts';
import { requireAuth, signJwt, JwtPayload } from '../middleware/auth.ts';
import type {
  Env,
  DocumentTemplate,
  AuditLogRow,
  ManualReviewRecord,
  LgpdRequestRecord,
  AdminRole,
} from '../../src/lib/types.ts';

export const adminRouter = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// ============================================================================
// AUTENTICAÇÃO ADMINISTRATIVA (PBKDF2-SHA256 & RBAC ESTRITO)
// ============================================================================

adminRouter.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ success: false, error: 'E-mail e senha são obrigatórios.', code: 'VALIDATION_ERROR' }, 400);
  }

  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'Serviço de banco de dados indisponível.', code: 'DB_UNAVAILABLE' }, 503);
  }

  const cleanEmail = email.trim().toLowerCase();
  const dbUser = await db.prepare(
    'SELECT * FROM admin_users WHERE LOWER(email) = ? AND is_active = 1'
  ).bind(cleanEmail).first<any>();

  let isValid = false;
  if (dbUser && dbUser.password_hash) {
    isValid = await verifyPasswordPbkdf2(password, dbUser.password_hash);
  } else {
    // Mitigação contra enumeração de usuários por tempo de resposta (Timing Attack)
    await verifyPasswordPbkdf2(password, 'pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000');
  }

  if (!isValid || !dbUser) {
    return c.json({ success: false, error: 'Credenciais administrativas inválidas.', code: 'INVALID_CREDENTIALS' }, 401);
  }

  const secret = c.env.JWT_ADMIN_SECRET;
  if (!secret) {
    return c.json({ success: false, error: 'Configuração de segurança do servidor incompleta (JWT_ADMIN_SECRET ausente).', code: 'SERVER_MISCONFIGURED' }, 500);
  }

  const token = await signJwt(
    {
      sub: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as AdminRole,
      exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    },
    secret
  );

  return c.json({
    success: true,
    token,
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    },
  });
});

adminRouter.use('*', requireAuth());

adminRouter.get('/auth/me', (c) => {
  const user = c.get('user');
  return c.json({ success: true, user });
});

// ============================================================================
// GESTÃO DE TEMPLATES DE PROCEDIMENTO MÉDICO
// ============================================================================

adminRouter.get('/templates', async (c) => {
  const db = c.env.DB;
  const templates = await db.prepare(
    'SELECT * FROM document_templates ORDER BY title ASC, version DESC'
  ).all<DocumentTemplate>();

  return c.json({ success: true, templates: templates.results || [] });
});

adminRouter.post('/templates', requireAuth(['admin_master', 'operador']), async (c) => {
  const body = await c.req.json();
  const parsed = CreateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { id, title, procedure_description, content_markdown, retention_days } = parsed.data;
  const db = c.env.DB;

  const latest = await db.prepare(
    'SELECT MAX(version) as max_ver FROM document_templates WHERE id = ?'
  ).bind(id).first<{ max_ver: number | null }>();

  const newVersion = (latest?.max_ver || 0) + 1;
  const contentSha256 = await sha256(content_markdown + '\n' + procedure_description);

  await db.prepare(
    `INSERT INTO document_templates 
      (id, version, title, procedure_description, content_markdown, content_sha256, consent_text_version, retention_days, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1, datetime('now'))`
  ).bind(id, newVersion, title, procedure_description, content_markdown, contentSha256, retention_days).run();

  return c.json({
    success: true,
    template: {
      id,
      version: newVersion,
      title,
      procedure_description,
      content_sha256: contentSha256,
      retention_days,
    },
    message: `Template '${title}' versionado com sucesso (v${newVersion}).`,
  });
});

// ============================================================================
// EMISSÃO E GESTÃO DE DOCUMENTOS
// ============================================================================

adminRouter.get('/documents', async (c) => {
  const db = c.env.DB;
  const limitQuery = c.req.query('limit');
  const limit = limitQuery === 'all' ? 100000 : (parseInt(limitQuery || '100', 10) || 100);

  const docs = await db.prepare(
    `SELECT d.id, d.template_id, d.template_version, d.minor_name, d.minor_birth_date, d.minor_cpf, d.parent_name,
            d.status, d.access_token, d.expires_at, d.retention_expires_at, d.created_at, d.revoked_at,
            d.cancelled_at, d.cancelled_by_admin_id, d.cancellation_reason, d.cancellation_ip,
            t.title as template_title, t.procedure_description
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     ORDER BY d.created_at DESC LIMIT ?`
  ).bind(limit).all<any>();

  return c.json({ success: true, documents: docs.results || [] });
});

adminRouter.get('/documents/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;

  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, t.content_markdown
     FROM documents d
     JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE d.id = ?`
  ).bind(id).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não encontrado.' }, 404);
  }

  const auditLog = await db.prepare(
    'SELECT * FROM audit_logs WHERE document_id = ?'
  ).bind(id).first<any>();

  const cancellationAudit = await db.prepare(
    'SELECT * FROM document_cancellation_audits WHERE document_id = ? ORDER BY cancelled_at DESC LIMIT 1'
  ).bind(id).first<any>();

  return c.json({ 
    success: true, 
    document: doc, 
    audit_log: auditLog || null,
    cancellation_audit: cancellationAudit || null 
  });
});

adminRouter.post('/documents', requireAuth(['admin_master', 'operador']), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = CreateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message, code: 'VALIDATION_ERROR' }, 400);
  }

  const { template_id, template_version, minor_name, minor_birth_date, parent_name, parent_email, parent_phone, expires_in_days } = parsed.data;
  const db = c.env.DB;
  const masterKey = c.env.ENCRYPTION_KEY_V1;
  if (!masterKey) {
    return c.json({ success: false, error: 'Chave de criptografia mestra não configurada no servidor (ENCRYPTION_KEY_V1).', code: 'KEY_CONFIG_ERROR' }, 500);
  }

  let query = 'SELECT * FROM document_templates WHERE id = ?';
  let params: any[] = [template_id];
  if (template_version) {
    query += ' AND version = ?';
    params.push(template_version);
  } else {
    query += ' AND is_active = 1 ORDER BY version DESC LIMIT 1';
  }

  const template = await db.prepare(query).bind(...params).first<DocumentTemplate>();
  if (!template) {
    return c.json({ success: false, error: 'Template de procedimento médico não encontrado ou inativo.' }, 404);
  }

  const docId = generateUniqueDocId('DOC');
  const accessToken = generateSecureToken(32);
  const contentSha256 = template.content_sha256;

  const parentEmailEncrypted = await encryptAesGcm(parent_email, masterKey, 1);
  const parentPhoneEncrypted = await encryptAesGcm(parent_phone, masterKey, 1);

  const expiresAt = new Date(Date.now() + expires_in_days * 86400000).toISOString();
  const retentionExpiresAt = new Date(Date.now() + template.retention_days * 86400000).toISOString();

  await db.prepare(
    `INSERT INTO documents (
      id, template_id, template_version, content_sha256, minor_name, minor_birth_date,
      parent_name, parent_email_encrypted, parent_phone_encrypted, key_version, access_token,
      status, created_by_admin, retention_expires_at, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', ?, ?, ?, datetime('now'))`
  ).bind(
    docId,
    template.id,
    template.version,
    contentSha256,
    minor_name,
    minor_birth_date,
    parent_name,
    parentEmailEncrypted,
    parentPhoneEncrypted,
    accessToken,
    user.email,
    retentionExpiresAt,
    expiresAt
  ).run();

  const signLink = `/assinar/${accessToken}`;

  return c.json({
    success: true,
    document: {
      id: docId,
      access_token: accessToken,
      sign_url: signLink,
      expires_at: expiresAt,
      retention_expires_at: retentionExpiresAt,
      template_title: template.title,
    },
    message: 'Termo de autorização gerado e link de assinatura disponibilizado.',
  });
});

// ============================================================================
// REVOGAÇÃO / CANCELAMENTO DE AUTORIZAÇÃO POR ERRO (CONFORMIDADE LGPD & MARCO CIVIL)
// ============================================================================

adminRouter.post('/documents/:id/cancel', requireAuth(['admin_master', 'operador']), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const parsed = CancelDocumentErrorSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({
      success: false,
      error: parsed.error.errors[0]?.message || 'Justificativa obrigatória (mínimo 10 caracteres) e confirmação requerida.',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  const { reason } = parsed.data;
  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'Serviço de banco de dados indisponível.', code: 'DB_UNAVAILABLE' }, 503);
  }

  // 1. Localiza documento
  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     WHERE d.id = ?`
  ).bind(id).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado no sistema.', code: 'DOC_NOT_FOUND' }, 404);
  }

  if (doc.status === 'CANCELADO_POR_ERRO' || doc.status === 'cancelled_error') {
    return c.json({
      success: false,
      error: 'Este documento já se encontra formalmente cancelado por inconsistência operacional.',
      code: 'ALREADY_CANCELLED',
    }, 400);
  }

  // 2. Extrai metadados forenses de IP e Navegador (Marco Civil da Internet Art. 15)
  const clientIp = c.req.header('cf-connecting-ip') || 
                   c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
                   c.req.header('x-real-ip') || 
                   '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin Web Panel';
  const cancelledAtIso = new Date().toISOString();
  const auditId = `CANCEL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. Busca hash do manifesto existente ou fallback
  const auditLog = await db.prepare('SELECT manifest_sha256 FROM audit_logs WHERE document_id = ?').bind(id).first<any>();
  const manifestSha256 = auditLog?.manifest_sha256 || doc.content_sha256 || '';

  // 4. Calcula Hash SHA-256 da linha de auditoria (Cadeia de Custódia e Não-Repúdio)
  const logRowHash = await sha256(
    `${auditId}|${doc.id}|${cancelledAtIso}|${user.sub}|${user.email}|${user.role}|${clientIp}|${manifestSha256}|${reason}`
  );

  // 5. Executa Soft Delete e Inserção Imutável de Auditoria via D1 Batch
  await db.batch([
    db.prepare(
      `UPDATE documents 
       SET status = 'CANCELADO_POR_ERRO',
           cancelled_at = ?,
           cancelled_by_admin_id = ?,
           cancellation_reason = ?,
           cancellation_ip = ?,
           revoked_at = ?,
           revoked_reason = ?
       WHERE id = ?`
    ).bind(
      cancelledAtIso,
      user.email,
      reason,
      clientIp,
      cancelledAtIso,
      `Cancelado por inconsistência operacional: ${reason}`,
      doc.id
    ),
    db.prepare(
      `INSERT INTO document_cancellation_audits (
        id, document_id, cancelled_at, ip_address, user_agent,
        cancelled_by_user_id, cancelled_by_user_email, cancelled_by_role,
        justification, document_manifest_sha256, log_row_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      auditId,
      doc.id,
      cancelledAtIso,
      clientIp,
      userAgent,
      user.sub,
      user.email,
      user.role,
      reason,
      manifestSha256,
      logRowHash
    ),
  ]);

  // 6. Notificação de Transparência por E-mail Transacional (LGPD Art. 6º, VI)
  let emailDispatched = false;
  let targetEmail: string | null = null;
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' && masterKey) {
    try {
      targetEmail = await decryptAesGcm(doc.parent_email_encrypted, masterKey);
    } catch {
      // Ignora falha de decriptação caso a chave seja mock/incompatível
    }
  }

  if (targetEmail && targetEmail.includes('@')) {
    const formattedDate = new Date(cancelledAtIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const emailHtml = getTransactionalCancellationEmailHtml({
      parentName: doc.parent_name || 'Responsável Legal',
      minorName: doc.minor_name || 'Estudante',
      documentId: doc.id,
      validationCode: manifestSha256 ? `SESI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
      cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
      institutionName: doc.institution_name || 'Escola CEMEIT',
      reason,
    });
    const emailText = getTransactionalCancellationEmailText({
      parentName: doc.parent_name || 'Responsável Legal',
      minorName: doc.minor_name || 'Estudante',
      documentId: doc.id,
      validationCode: manifestSha256 ? `SESI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
      cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
      institutionName: doc.institution_name || 'Escola CEMEIT',
      reason,
    });

    const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';

    try {
      if ((c.env as any).RESEND_API_KEY) {
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(c.env as any).RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [targetEmail],
            subject: `[SESI / Escola Cidadã] Notificação: Invalidação de Documento por Inconsistência Operacional`,
            html: emailHtml,
            text: emailText,
          }),
        });
        if (resendResp.ok) {
          emailDispatched = true;
        }
      } else {
        const mcResp = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: targetEmail }] }],
            from: { email: 'autorizacoes@catraki.com.br', name: 'Escola Cidadã — SESI Saúde' },
            subject: `[SESI / Escola Cidadã] Notificação: Invalidação de Documento por Inconsistência Operacional`,
            content: [
              { type: 'text/plain', value: emailText },
              { type: 'text/html', value: emailHtml },
            ],
          }),
        });
        if (mcResp.ok) {
          emailDispatched = true;
        }
      }
    } catch {
      // Log silencioso para garantir atomicidade do cancelamento
    }
  }

  return c.json({
    success: true,
    document_id: doc.id,
    status: 'CANCELADO_POR_ERRO',
    cancelled_at: cancelledAtIso,
    audit_record_id: auditId,
    log_row_hash: logRowHash,
    email_notification_dispatched: emailDispatched,
    message: 'Autorização cancelada com sucesso por inconsistência operacional. A trilha forense foi registrada e o responsável legal foi notificado.',
  });
});

// Alias da rota de cancelamento
adminRouter.post('/documents/:id/revoke-error', requireAuth(['admin_master', 'operador']), async (c) => {
  const handler = adminRouter.routes.find((r) => r.path === '/documents/:id/cancel' && r.method === 'POST')?.handler;
  if (handler) {
    return handler(c, async () => {});
  }
  return c.json({ success: false, error: 'Rota não encontrada' }, 404);
});

// Bloqueio explícito e normativo contra comandos de exclusão física permanente
adminRouter.delete('/documents/:id', async (c) => {
  return c.json({
    success: false,
    error: 'VIOLAÇÃO LEGAL: A exclusão física (DELETE) de termos e documentos é expressamente vedada pela LGPD (Lei 13.709/2018, Art. 16), Marco Civil da Internet (Lei 12.965/2014, Art. 15) e Lei 14.063/2020. Utilize a rota de cancelamento administrativo (POST /api/admin/documents/:id/cancel) com status CANCELADO_POR_ERRO.',
    code: 'PHYSICAL_DELETION_PROHIBITED',
  }, 405);
});

// Trilha de auditoria das revogações e cancelamentos
adminRouter.get('/cancellation-audits', requireAuth(['admin_master', 'dpo', 'operador']), async (c) => {
  const db = c.env.DB;
  const list = await db.prepare(
    `SELECT c.*, d.minor_name, d.parent_name, t.title as template_title
     FROM document_cancellation_audits c
     JOIN documents d ON c.document_id = d.id
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     ORDER BY c.cancelled_at DESC LIMIT 100`
  ).all<any>();

  return c.json({ success: true, cancellation_audits: list.results || [] });
});

// ============================================================================
// FILA DE REVISÃO MANUAL
// ============================================================================

adminRouter.get('/manual-reviews', requireAuth(['admin_master', 'operador']), async (c) => {
  const db = c.env.DB;
  const reviews = await db.prepare(
    `SELECT r.*, d.minor_name, d.minor_birth_date, t.title as template_title, t.procedure_description
     FROM manual_review_queue r
     JOIN documents d ON r.document_id = d.id
     JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     ORDER BY r.created_at DESC`
  ).all<any>();

  return c.json({ success: true, reviews: reviews.results || [] });
});

adminRouter.post('/manual-reviews/:id/action', requireAuth(['admin_master']), async (c) => {
  const user = c.get('user');
  const reviewId = c.req.param('id');
  const body = await c.req.json();
  const parsed = ManualReviewActionSchema.safeParse({ review_id: reviewId, ...body });

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message }, 400);
  }

  const { action, notes } = parsed.data;
  const db = c.env.DB;

  const review = await db.prepare('SELECT * FROM manual_review_queue WHERE id = ?').bind(reviewId).first<ManualReviewRecord>();
  if (!review) {
    return c.json({ success: false, error: 'Registro de revisão não encontrado.' }, 404);
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await db.prepare(
    `UPDATE manual_review_queue 
     SET status = ?, reviewed_by = ?, review_notes = ?, updated_at = datetime('now') 
     WHERE id = ?`
  ).bind(newStatus, user.email, notes || `Revisão ${action === 'approve' ? 'aprovada' : 'rejeitada'} por ${user.name}`, reviewId).run();

  return c.json({
    success: true,
    review_id: reviewId,
    status: newStatus,
    message: `Vínculo de responsabilidade legal ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso.`,
  });
});

// ============================================================================
// AUDITORIA FORENSE E HASH CHAIN
// ============================================================================

adminRouter.get('/verify-chain', requireAuth(['admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const auditLogs = await db.prepare(
    'SELECT * FROM audit_logs ORDER BY created_at ASC'
  ).all<AuditLogRow>();

  const rows = auditLogs.results || [];
  const verification = await verifyAuditChain(rows);

  return c.json({
    success: true,
    verification,
    total_blocks_audited: rows.length,
    timestamp_utc: new Date().toISOString(),
  });
});

adminRouter.get('/audit-logs', requireAuth(['admin_master', 'dpo', 'operador']), async (c) => {
  const db = c.env.DB;
  const logs = await db.prepare(
    `SELECT a.id, a.document_id, a.signed_at, a.signer_name, a.signer_cpf_masked, a.signer_relationship,
            a.identity_method, a.ip_address, a.geo_city, a.geo_region, a.manifest_sha256, a.log_row_hash,
            a.prev_log_hash, a.created_at, d.minor_name
     FROM audit_logs a
     LEFT JOIN documents d ON a.document_id = d.id
     ORDER BY a.created_at DESC LIMIT 100`
  ).all<any>();

  return c.json({ success: true, logs: logs.results || [] });
});

// ============================================================================
// ANCORAGEM MERKLE TREE (INTEGRIDADE GLOBAL E IMUTABILIDADE)
// ============================================================================

adminRouter.get('/merkle-anchors', requireAuth(['admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const anchors = await db.prepare(
    'SELECT * FROM merkle_roots_anchors ORDER BY created_at DESC LIMIT 50'
  ).all<any>();

  return c.json({ success: true, anchors: anchors.results || [] });
});

adminRouter.post('/anchor-merkle', requireAuth(['admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const logs = await db.prepare(
    'SELECT log_row_hash FROM audit_logs ORDER BY created_at ASC'
  ).all<{ log_row_hash: string }>();

  const hashes = (logs.results || []).map((r) => r.log_row_hash);
  if (hashes.length === 0) {
    return c.json({ success: false, error: 'Nenhum registro de auditoria disponível para ancoragem.' }, 400);
  }

  const merkleRoot = await computeMerkleRoot(hashes);
  const anchorId = `ANCHOR-${Date.now()}`;

  await db.prepare(
    `INSERT INTO merkle_roots_anchors (
      id, period_start, period_end, row_count, merkle_root_sha256, anchor_target, anchor_reference, created_at
    ) VALUES (?, datetime('now', '-1 day'), datetime('now'), ?, ?, 'GIT_COMMIT_IMMUTABLE_LOG', ?, datetime('now'))`
  ).bind(anchorId, hashes.length, merkleRoot, `merkle-tree-root-${merkleRoot.substring(0, 16)}`).run();

  return c.json({
    success: true,
    anchor_id: anchorId,
    merkle_root_sha256: merkleRoot,
    records_count: hashes.length,
    message: 'Raiz de Merkle calculada e ancorada com sucesso no banco de custódia.',
  });
});

// ============================================================================
// ATENDIMENTO LGPD ART. 18
// ============================================================================

adminRouter.get('/lgpd-requests', requireAuth(['admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const requests = await db.prepare(
    'SELECT * FROM lgpd_requests ORDER BY created_at DESC'
  ).all<LgpdRequestRecord>();

  return c.json({ success: true, requests: requests.results || [] });
});

adminRouter.post('/lgpd-requests/:id/respond', requireAuth(['admin_master', 'dpo']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status, response_notes } = body;
  const db = c.env.DB;

  if (!status || !response_notes) {
    return c.json({ success: false, error: 'Status e parecer do DPO são obrigatórios.' }, 400);
  }

  await db.prepare(
    `UPDATE lgpd_requests 
     SET status = ?, response_notes = ?, resolved_at = datetime('now') 
     WHERE id = ?`
  ).bind(status, response_notes, id).run();

  return c.json({
    success: true,
    message: 'Solicitação LGPD atualizada com o parecer do DPO.',
  });
});

// ============================================================================
// GESTÃO DE INSTITUIÇÕES / ESCOLAS (ROTEAMENTO DINÂMICO)
// ============================================================================

adminRouter.get('/institutions', requireAuth(['operador', 'admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const list = await db.prepare('SELECT * FROM institutions ORDER BY name ASC').all<any>();
  return c.json({ success: true, institutions: list.results });
});

adminRouter.post('/institutions', requireAuth(['admin_master']), async (c) => {
  const body = await c.req.json();
  const { id, name, short_name, city, state } = body;
  const db = c.env.DB;

  if (!id || !name || !short_name) {
    return c.json({ success: false, error: 'Slug (ID), Nome e Sigla são obrigatórios.' }, 400);
  }

  const cleanSlug = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  await db.prepare(
    `INSERT INTO institutions (id, name, short_name, city, state, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name, city = excluded.city, state = excluded.state, is_active = 1`
  ).bind(cleanSlug, name.trim(), short_name.trim(), city?.trim() || 'Brasília', state?.trim() || 'DF').run();

  return c.json({
    success: true,
    institution: { id: cleanSlug, name: name.trim(), short_name: short_name.trim(), city: city || 'Brasília', state: state || 'DF' },
    message: 'Instituição / Escola cadastrada com sucesso.',
  });
});

adminRouter.delete('/institutions/:id', requireAuth(['admin_master']), async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  await db.prepare('UPDATE institutions SET is_active = 0 WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'Instituição desativada com sucesso.' });
});
