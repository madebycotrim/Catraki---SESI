import { Hono } from 'hono';
import {
  CreateTemplateSchema,
  CreateDocumentSchema,
  ManualReviewActionSchema,
  generateUniqueDocId,
} from '../../src/lib/schemas.ts';
import {
  sha256,
  generateSecureToken,
  encryptAesGcm,
  constantTimeEqual,
} from '../../src/lib/crypto.ts';
import { verifyAuditChain } from '../../src/lib/audit-chain.ts';
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
// AUTENTICAÇÃO ADMINISTRATIVA
// ============================================================================

adminRouter.post('/auth/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: 'E-mail e senha são obrigatórios.' }, 400);
  }

  const DEFAULT_ADMINS = [
    {
      id: 'usr_master_01',
      name: 'Mateus Cotrim',
      email: 'mateus.cotrim@sistemafibra.org.br',
      password: 'SesiMaster@2026',
      role: 'admin_master' as AdminRole,
    },
    {
      id: 'usr_operador_01',
      name: 'Ana Paula Ferreira (Operador Clínico)',
      email: 'operador@sesi.org.br',
      password: 'SesiOperador@2026',
      role: 'operador' as AdminRole,
    },
    {
      id: 'usr_dpo_01',
      name: 'Juliana Mendes (DPO / Privacidade)',
      email: 'dpo@sesi.org.br',
      password: 'SesiDpo@2026',
      role: 'dpo' as AdminRole,
    },
  ];

  const admin = DEFAULT_ADMINS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!admin || !constantTimeEqual(admin.password, password)) {
    return c.json({ success: false, error: 'Credenciais administrativas inválidas.', code: 'INVALID_CREDENTIALS' }, 401);
  }

  const secret = c.env.JWT_ADMIN_SECRET || 'SESI_DEV_SECRET_KEY_FOR_LOCAL_TESTS_12345';
  const token = await signJwt(
    {
      sub: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    },
    secret
  );

  return c.json({
    success: true,
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
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
  const docs = await db.prepare(
    `SELECT d.id, d.template_id, d.template_version, d.minor_name, d.minor_birth_date, d.parent_name,
            d.status, d.access_token, d.expires_at, d.retention_expires_at, d.created_at, d.revoked_at,
            t.title as template_title, t.procedure_description
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     ORDER BY d.created_at DESC LIMIT 100`
  ).all<any>();

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

  return c.json({ success: true, document: doc, audit_log: auditLog || null });
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
  const masterKey = c.env.ENCRYPTION_KEY_V1 || 'SESI_ENCRYPTION_KEY_32BYTES_TEST123';

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
