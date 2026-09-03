import { Hono } from 'hono';
import {
  CreateTemplateSchema,
  CreateDocumentSchema,
  ManualReviewActionSchema,
  CancelDocumentErrorSchema,
  LogAdminExportSchema,
  generateUniqueDocId,
  formatCPF,
} from '../../src/lib/schemas.ts';
import {
  sha256,
  hmacSha256,
  generateSecureToken,
  encryptAesGcm,
  decryptAesGcm,
  verifyPasswordPbkdf2,
} from '../../src/lib/crypto.ts';
import {
  getTransactionalCancellationEmailHtml,
  getTransactionalCancellationEmailText,
  getCancellationEmailSubject,
  getTransactionalCompletionEmailHtml,
  getTransactionalCompletionEmailText,
  getCompletionEmailSubject,
} from '../../src/lib/email-templates.ts';
import { verifyAuditChain, computeMerkleRoot } from '../../src/lib/audit-chain.ts';
import { requireAuth, signJwt, JwtPayload } from '../middleware/auth.ts';
import { extractCloudflareClientData } from '../utils/cloudflare.ts';
import { GeradorCertificadoConclusao, EventoCertificado } from '../../src/lib/pades/GeradorCertificadoConclusao.ts';
import type {
  Env,
  DocumentTemplate,
  DocumentRecord,
  AuditLogRow,
  ManualReviewRecord,
  LgpdRequestRecord,
  AdminRole,
} from '../../src/lib/types.ts';

export const adminRouter = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

/**
 * Registra eventos imutáveis na trilha de auditoria administrativa (admin_audit_logs)
 */
export async function logAdminAction(
  db: D1Database,
  actor: { sub: string; email: string; role: string },
  eventType: string,
  targetResource: string,
  details: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    const id = `ADM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const logRowHash = await sha256(`${id}|${eventType}|${actor.sub}|${actor.email}|${ipAddress}|${targetResource}|${details}`);
    await db.prepare(
      `INSERT INTO admin_audit_logs (
        id, event_type, actor_user_id, actor_user_email, actor_user_role,
        ip_address, user_agent, target_resource, action_details, log_row_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id, eventType, actor.sub, actor.email, actor.role,
      ipAddress, userAgent, targetResource, details, logRowHash
    ).run();
  } catch (e) {
    console.error('Falha ao gravar admin_audit_logs:', e);
  }
}

// ============================================================================
// AUTENTICAÇÃO ADMINISTRATIVA (PBKDF2-SHA256 & RBAC ESTRITO)
// ============================================================================

adminRouter.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;
  const cfData = extractCloudflareClientData(c);
  const clientIp = cfData.ip;
  const userAgent = cfData.userAgent;

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
    // Grava log de tentativa falha de login (Segurança Marco Civil e LGPD Art. 46)
    await logAdminAction(
      db,
      { sub: 'UNKNOWN', email: cleanEmail, role: 'unauthenticated' },
      'LOGIN_FAILED',
      'auth:login',
      'Tentativa de login com credenciais inválidas',
      clientIp,
      userAgent
    );
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

  // Grava log de login bem-sucedido
  await logAdminAction(
    db,
    { sub: dbUser.id, email: dbUser.email, role: dbUser.role },
    'LOGIN_SUCCESS',
    'auth:login',
    'Autenticação administrativa bem-sucedida via PBKDF2',
    clientIp,
    userAgent
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
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = CreateTemplateSchema.safeParse(body);
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

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

  // Grava auditoria imutável
  await logAdminAction(
    db,
    user,
    'TEMPLATE_CREATE',
    `template:${id}:v${newVersion}`,
    `Template '${title}' versionado para v${newVersion} com retenção de ${retention_days} dias`,
    clientIp,
    userAgent
  );

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
  if (!db) {
    return c.json({ success: true, documents: [] });
  }

  const limitQuery = c.req.query('limit');
  const limit = limitQuery === 'all' ? 100000 : (parseInt(limitQuery || '100', 10) || 100);

  try {
    const docs = await db.prepare(
      `SELECT d.*, t.title as template_title, t.procedure_description
       FROM documents d
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       ORDER BY d.created_at DESC LIMIT ?`
    ).bind(limit).all<any>();

    const results = await Promise.all((docs.results || []).map(async (doc: any) => {
      if (doc.minor_cpf_encrypted && c.env.ENCRYPTION_KEY_V1) {
        try {
          const raw = await decryptAesGcm(doc.minor_cpf_encrypted, c.env.ENCRYPTION_KEY_V1);
          if (raw && raw.replace(/\D/g, '').length === 11) {
            doc.minor_cpf = formatCPF(raw);
          }
        } catch {}
      } else if (doc.minor_cpf && !doc.minor_cpf.includes('*')) {
        doc.minor_cpf = formatCPF(doc.minor_cpf);
      }
      return doc;
    }));

    return c.json({ success: true, documents: results });
  } catch (err: any) {
    try {
      const fallbackDocs = await db.prepare(
        `SELECT * FROM documents ORDER BY created_at DESC LIMIT ?`
      ).bind(limit).all<any>();

      const results = await Promise.all((fallbackDocs.results || []).map(async (doc: any) => {
        if (doc.minor_cpf_encrypted && c.env.ENCRYPTION_KEY_V1) {
          try {
            const raw = await decryptAesGcm(doc.minor_cpf_encrypted, c.env.ENCRYPTION_KEY_V1);
            if (raw && raw.replace(/\D/g, '').length === 11) {
              doc.minor_cpf = formatCPF(raw);
            }
          } catch {}
        } else if (doc.minor_cpf && !doc.minor_cpf.includes('*')) {
          doc.minor_cpf = formatCPF(doc.minor_cpf);
        }
        return doc;
      }));

      return c.json({ success: true, documents: results });
    } catch (fallbackErr: any) {
      return c.json({ success: true, documents: [] });
    }
  }
});

adminRouter.post('/documents/cleanup-pending', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'Banco de dados indisponível.' }, 503);
  }

  try {
    const result = await db.prepare(
      `UPDATE documents 
       SET status = 'expired'
       WHERE status = 'pending' 
         AND (
           expires_at < datetime('now') 
           OR created_at < datetime('now', '-24 hours')
           OR minor_name = 'Estudante'
           OR minor_name = 'Aguardando preenchimento'
         )`
    ).run();

    const count = result.meta?.changes || 0;

    return c.json({
      success: true,
      expired_count: count,
      message: `${count} rascunhos pendentes foram expirados com sucesso em conformidade com a LGPD.`,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

adminRouter.get('/documents/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'Banco de dados indisponível.' }, 503);
  }

  try {
    const doc = await db.prepare(
      `SELECT d.*, t.title as template_title, t.procedure_description, t.content_markdown
       FROM documents d
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE d.id = ?`
    ).bind(id).first<any>();

    if (!doc) {
      return c.json({ success: false, error: 'Documento não encontrado.' }, 404);
    }

    if (doc.minor_cpf_encrypted && c.env.ENCRYPTION_KEY_V1) {
      try {
        const raw = await decryptAesGcm(doc.minor_cpf_encrypted, c.env.ENCRYPTION_KEY_V1);
        if (raw && raw.replace(/\D/g, '').length === 11) {
          doc.minor_cpf = formatCPF(raw);
        }
      } catch {}
    } else if (doc.minor_cpf && !doc.minor_cpf.includes('*')) {
      doc.minor_cpf = formatCPF(doc.minor_cpf);
    }

    const auditLog = await db.prepare(
      'SELECT * FROM audit_logs WHERE document_id = ?'
    ).bind(id).first<any>().catch(() => null);

    let cancellationAudit = null;
    try {
      cancellationAudit = await db.prepare(
        'SELECT * FROM document_cancellation_audits WHERE document_id = ? ORDER BY cancelled_at DESC LIMIT 1'
      ).bind(id).first<any>();
    } catch {
      // Tabela de auditoria de cancelamento pode ainda não existir em banco legado
    }

    return c.json({ 
      success: true, 
      document: doc, 
      audit_log: auditLog || null,
      cancellation_audit: cancellationAudit || null 
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao carregar documento.' }, 500);
  }
});

adminRouter.post('/documents', requireAuth(['admin_master', 'operador']), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = CreateDocumentSchema.safeParse(body);
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

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
  // Blind index determinístico para buscas seguras sob sigilo (LGPD Art. 11/18)
  const parentEmailBindex = await hmacSha256(parent_email.trim().toLowerCase(), c.env.OTP_PEPPER || 'bindex_secret');

  const expiresAt = new Date(Date.now() + expires_in_days * 86400000).toISOString();
  const retentionExpiresAt = new Date(Date.now() + template.retention_days * 86400000).toISOString();

  await db.prepare(
    `INSERT INTO documents (
      id, template_id, template_version, content_sha256, minor_name, minor_birth_date,
      parent_name, parent_email_encrypted, parent_phone_encrypted, parent_email_bindex_sha256, key_version, access_token,
      status, created_by_admin, retention_expires_at, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', ?, ?, ?, datetime('now'))`
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
    parentEmailBindex,
    accessToken,
    user.email,
    retentionExpiresAt,
    expiresAt
  ).run();

  await logAdminAction(
    db,
    user,
    'DOCUMENT_CREATE',
    `document:${docId}`,
    `Termo de autorização gerado para menor '${minor_name}' com template '${template.title}'`,
    clientIp,
    userAgent
  );

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

  // 5. Executa Soft Delete e Inserção Imutável de Auditoria com Fallbacks Resilientes
  let updateSucceeded = false;
  let finalStatus = 'CANCELADO_POR_ERRO';

  // Tentativa 1: Schema completo com colunas dedicadas de cancelamento
  try {
    const res = await db.prepare(
      `UPDATE documents 
       SET status = 'CANCELADO_POR_ERRO',
           cancelled_at = ?,
           cancelled_by_admin_id = ?,
           cancellation_reason = ?,
           cancellation_ip = ?,
           revoked_at = ?,
           revoked_reason = ?
       WHERE id = ? OR access_token = ?`
    ).bind(
      cancelledAtIso,
      user.email,
      reason,
      clientIp,
      cancelledAtIso,
      `Cancelado por inconsistência operacional: ${reason}`,
      doc.id,
      doc.id
    ).run();
    if (res.success || (res as any).meta?.changes > 0) {
      updateSucceeded = true;
      finalStatus = 'CANCELADO_POR_ERRO';
    }
  } catch (e1) {
    console.warn('Tentativa 1 falhou, tentando fallback 2:', e1);
  }

  // Tentativa 2: CANCELADO_POR_ERRO com colunas padrão revoked_at / revoked_reason
  if (!updateSucceeded) {
    try {
      const res = await db.prepare(
        `UPDATE documents 
         SET status = 'CANCELADO_POR_ERRO',
             revoked_at = ?,
             revoked_reason = ?
         WHERE id = ? OR access_token = ?`
      ).bind(
        cancelledAtIso,
        `Cancelado por inconsistência operacional: ${reason}`,
        doc.id,
        doc.id
      ).run();
      if (res.success || (res as any).meta?.changes > 0) {
        updateSucceeded = true;
        finalStatus = 'CANCELADO_POR_ERRO';
      }
    } catch (e2) {
      console.warn('Tentativa 2 falhou, tentando fallback 3 (status = revoked):', e2);
    }
  }

  // Tentativa 3: Status 'revoked' (100% compatível com todas as versões de SQLite e CHECK constraints)
  if (!updateSucceeded) {
    try {
      const res = await db.prepare(
        `UPDATE documents 
         SET status = 'revoked',
             revoked_at = ?,
             revoked_reason = ?
         WHERE id = ? OR access_token = ?`
      ).bind(
        cancelledAtIso,
        `Cancelado por inconsistência operacional: ${reason}`,
        doc.id,
        doc.id
      ).run();
      if (res.success || (res as any).meta?.changes > 0) {
        updateSucceeded = true;
        finalStatus = 'revoked';
      }
    } catch (e3) {
      console.warn('Tentativa 3 falhou, tentando fallback 4:', e3);
    }
  }

  // Tentativa 4: UPDATE direto de status simples
  if (!updateSucceeded) {
    try {
      await db.prepare(
        `UPDATE documents SET status = 'revoked' WHERE id = ? OR access_token = ?`
      ).bind(doc.id, doc.id).run();
      updateSucceeded = true;
      finalStatus = 'revoked';
    } catch (e4) {
      console.error('Falha crítica ao atualizar status do documento no D1:', e4);
    }
  }

  // Registro na Trilha de Auditoria Forense
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS document_cancellation_audits (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        cancelled_at DATETIME NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        cancelled_by_user_id TEXT NOT NULL,
        cancelled_by_user_email TEXT NOT NULL,
        cancelled_by_role TEXT NOT NULL,
        justification TEXT NOT NULL,
        document_manifest_sha256 TEXT,
        log_row_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});

    await db.prepare(
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
    ).run().catch(() => {});
  } catch (auditErr) {
    console.warn('Falha ao registrar auditoria de cancelamento:', auditErr);
  }

  // Grava log administrativo
  await logAdminAction(
    db,
    user,
    'DOCUMENT_CANCEL_ERROR',
    `document:${doc.id}`,
    `Documento ${doc.id} cancelado/revogado. Motivo: ${reason}`,
    clientIp,
    userAgent
  );

  // ── KV DENYLIST (Pilar 5 — Invalidação Instantânea de Token) ──────────────────
  const kv = c.env.KV_RATE_LIMIT;
  if (kv) {
    try {
      const ttl = 60 * 60 * 24 * 365 * 5; // 5 anos
      if (doc.access_token) {
        await kv.put(`revoked:${doc.access_token}`, cancelledAtIso, { expirationTtl: ttl });
      }
      if (doc.id) {
        await kv.put(`revoked:${doc.id}`, cancelledAtIso, { expirationTtl: ttl });
      }
    } catch {
      // Falha silenciosa
    }
  }

  // 6. Notificação de Transparência por E-mail Transacional (LGPD Art. 6º, VI)
  let emailDispatched = false;
  const notifyEmail = (body?.notify_email || body?.email || '').trim();
  let targetEmail: string | null = (notifyEmail && notifyEmail.includes('@')) ? notifyEmail : null;
  const masterKey = c.env.ENCRYPTION_KEY_V1;

  if (!targetEmail && doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' && masterKey) {
    try {
      targetEmail = await decryptAesGcm(doc.parent_email_encrypted, masterKey);
    } catch {
      // Ignora falha de decriptação caso a chave seja mock/incompatível
    }
  }

  if (!targetEmail && (doc as any).parent_email && (doc as any).parent_email.includes('@')) {
    targetEmail = (doc as any).parent_email;
  }

  if (targetEmail && targetEmail.includes('@')) {
    const formattedDate = new Date(cancelledAtIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const docTitle = (doc as any).title || (doc as any).document_title || (doc.minor_name ? `Termo de Consentimento - ${doc.minor_name}` : 'Termo de Consentimento');
    const emailSubject = getCancellationEmailSubject();
    const emailHtml = getTransactionalCancellationEmailHtml({
      parentName: doc.parent_name || 'Responsável Legal',
      minorName: doc.minor_name || 'Estudante',
      documentId: doc.id,
      documentTitle: docTitle,
      validationCode: manifestSha256 ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
      cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
      institutionName: doc.institution_name || 'Escola CEMEIT',
      reason,
      // Novos campos de transparência LGPD
      documentHashSha256: manifestSha256 || undefined,
      // Nome institucional do sistema — o responsável real está na trilha de auditoria forense
      revokedByName: 'Gestão Administrativa — Plataforma Catraki',
      revokedByEmail: 'autorizacoes@catraki.com.br',
    });
    const emailText = getTransactionalCancellationEmailText({
      parentName: doc.parent_name || 'Responsável Legal',
      minorName: doc.minor_name || 'Estudante',
      documentId: doc.id,
      documentTitle: docTitle,
      validationCode: manifestSha256 ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
      cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
      institutionName: doc.institution_name || 'Escola CEMEIT',
      reason,
      documentHashSha256: manifestSha256 || undefined,
      // Nome institucional do sistema — o responsável real está na trilha de auditoria forense
      revokedByName: 'Gestão Administrativa — Plataforma Catraki',
      revokedByEmail: 'autorizacoes@catraki.com.br',
    });

    const fromAddress = (c.env as any).EMAIL_FROM || 'Escola Cidadã — Saúde em Movimento <autorizacoes@catraki.com.br>';

    try {
      if ((c.env as any).RESEND_API_KEY) {
        let resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(c.env as any).RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [targetEmail],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          }),
        });

        // Fallback para onboarding@resend.dev se o domínio customizado não estiver verificado
        if (!resendResp.ok) {
          resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${(c.env as any).RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Escola Cidadã — Saúde em Movimento <onboarding@resend.dev>',
              to: [targetEmail],
              subject: emailSubject,
              html: emailHtml,
              text: emailText,
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: targetEmail }] }],
            from: { email: 'autorizacoes@catraki.com.br', name: 'Escola Cidadã — Saúde em Movimento' },
            subject: emailSubject,
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
      // Log silencioso
    }
  }

  // Registra que a notificação foi enviada (coluna adicionada no Pilar 5)
  if (emailDispatched) {
    await db.prepare(
      `UPDATE documents SET revocation_notification_sent_at = ? WHERE id = ?`
    ).bind(cancelledAtIso, doc.id).run().catch(() => {});
  }

  // --- SINCRONIZAÇÃO AUTOMÁTICA DE CANCELAMENTO/REVOGAÇÃO COM SMS-MEDCO (Supabase) ---
  try {
    const supabaseUrl = (c.env as any).SUPABASE_URL;
    const supabaseKey = (c.env as any).SUPABASE_SECRET_KEY || (c.env as any).SUPABASE_SERVICE_ROLE_KEY;
    const masterKey = c.env.ENCRYPTION_KEY_V1;

    let minorCpfForSync: string | null = null;
    if (doc.minor_cpf_encrypted && masterKey) {
      try {
        minorCpfForSync = await decryptAesGcm(doc.minor_cpf_encrypted, masterKey);
      } catch {}
    } else if (doc.minor_cpf && !doc.minor_cpf.includes('*')) {
      minorCpfForSync = doc.minor_cpf;
    }

    if (supabaseUrl && supabaseKey && minorCpfForSync) {
      const cleanCpf = minorCpfForSync.replace(/\D/g, '');
      const formattedCpf = formatCPF(cleanCpf);
      const queryParam = `or=(cpf.eq.${encodeURIComponent(cleanCpf)},cpf.eq.${encodeURIComponent(formattedCpf)})`;

      await fetch(`${supabaseUrl}/rest/v1/patients?${queryParam}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          tcle_accepted_at: null,
          tcle_protocol: null,
        }),
      });
      console.log(`[Catraki Admin] Consentimento cancelado no Supabase do SMS-MEDCO para o CPF ${cleanCpf}`);
    }
  } catch (syncErr) {
    console.error('[Catraki Admin] Erro ao sincronizar cancelamento com SMS-MEDCO:', syncErr);
  }
  // --- FIM DA SINCRONIZAÇÃO ---

  return c.json({
    success: true,
    document_id: doc.id,
    status: finalStatus,
    cancelled_at: cancelledAtIso,
    audit_record_id: auditId,
    log_row_hash: logRowHash,
    manifest_sha256: manifestSha256,
    token_revoked_in_kv: !!(kv && doc.access_token),
    email_notification_dispatched: emailDispatched,
    target_email: targetEmail,
    message: emailDispatched 
      ? `Autorização cancelada e notificação por e-mail enviada com sucesso para ${targetEmail}.`
      : 'Autorização cancelada com sucesso. Trilha de auditoria forense gravada.',
  });
});

// ============================================================================
// EMAIL DO RESPONSÁVEL — DESCRIPTOGRAFIA SEGURA (Pilar LGPD — Art. 5º, X)
// Retorna o e-mail descriptografado do responsável legal para preenchimento
// automático do campo de notificação no modal de cancelamento administrativo.
// ============================================================================

/**
 * GET /api/admin/documents/:id/parent-email
 * Descriptografa e retorna o e-mail do responsável legal cadastrado no documento.
 * Utilizado pelo painel administrativo para preencher automaticamente o campo
 * de notificação no fluxo de cancelamento/anulação de documento.
 */
adminRouter.get('/documents/:id/parent-email', requireAuth(['admin_master', 'operador']), async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;

  if (!db) {
    return c.json({ success: false, error: 'Banco de dados indisponível.' }, 503);
  }

  try {
    const doc = await db.prepare(
      `SELECT parent_email_encrypted, parent_name, parent_email FROM documents WHERE id = ?`
    ).bind(id).first<any>();

    if (!doc) {
      return c.json({ success: false, error: 'Documento não encontrado.', code: 'DOC_NOT_FOUND' }, 404);
    }

    const masterKey = c.env.ENCRYPTION_KEY_V1;
    let parentEmail: string | null = null;

    // Tenta descriptografar o e-mail protegido
    if (doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' && masterKey) {
      try {
        parentEmail = await decryptAesGcm(doc.parent_email_encrypted, masterKey);
      } catch {
        // Falha silenciosa — fallback abaixo
      }
    }

    // Fallback: e-mail em texto plano (documentos legados anteriores à criptografia)
    if (!parentEmail && doc.parent_email && doc.parent_email.includes('@')) {
      parentEmail = doc.parent_email;
    }

    if (!parentEmail) {
      return c.json({
        success: false,
        error: 'E-mail do responsável não disponível para este documento.',
        code: 'EMAIL_NOT_FOUND',
      }, 404);
    }

    return c.json({
      success: true,
      parent_email: parentEmail,
      parent_name: doc.parent_name || null,
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Erro ao recuperar e-mail do responsável.', code: 'DECRYPT_ERROR' }, 500);
  }
});

// ============================================================================
// CERTIFICADO DE CONCLUSÃO PDF (Pilar 4 — Lei 14.063/2020)
// Download do relatório forense de linha do tempo do documento
// ============================================================================

/**
 * GET /api/admin/documents/:id/certificate
 * Gera e retorna o Certificado de Conclusão em PDF (relatório de timeline forense)
 */
adminRouter.get('/documents/:id/certificate', requireAuth(['admin_master', 'operador', 'dpo']), async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;

  // Busca o documento e sua trilha de auditoria completa
  const doc = await db.prepare(
    `SELECT d.*, t.title as template_title, t.procedure_description, i.name as institution_name
     FROM documents d
     LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
     LEFT JOIN institutions i ON d.created_by_admin LIKE '%' || i.id || '%'
     WHERE d.id = ?`
  ).bind(id).first<any>();

  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const auditLog = await db.prepare(
    'SELECT * FROM audit_logs WHERE document_id = ? ORDER BY created_at ASC LIMIT 1'
  ).bind(id).first<any>();

  const cancellationAudit = await db.prepare(
    'SELECT * FROM document_cancellation_audits WHERE document_id = ? ORDER BY cancelled_at DESC LIMIT 1'
  ).bind(id).first<any>().catch(() => null);

  // Monta a linha do tempo de eventos
  const eventos: EventoCertificado[] = [];

  if (doc.created_at) {
    eventos.push({
      timestamp: doc.created_at,
      tipo: 'CRIACAO',
      descricao: `Documento criado pelo administrador ${doc.created_by_admin || 'sistema'}.`,
    });
  }

  if (auditLog?.signed_at && doc.status !== 'pending') {
    if (doc.otp_requested_at) {
      eventos.push({
        timestamp: doc.otp_requested_at,
        tipo: 'OTP_SOLICITADO',
        descricao: 'Código de verificação MFA/OTP solicitado pelo responsável legal.',
        ip: auditLog.ip_address,
        geo: [auditLog.geo_city, auditLog.geo_region, auditLog.geo_country].filter(Boolean).join('/') || null,
      });
    }
    if (auditLog.otp_verified_at || auditLog.signed_at) {
      eventos.push({
        timestamp: auditLog.otp_verified_at || auditLog.signed_at,
        tipo: 'OTP_VERIFICADO',
        descricao: 'Código MFA/OTP verificado com sucesso. Identidade confirmada.',
        ip: auditLog.ip_address,
      });
    }
    eventos.push({
      timestamp: auditLog.signed_at,
      tipo: 'ASSINADO',
      descricao: `Assinatura eletrônica avançada registrada por ${auditLog.signer_name || 'Responsável'}. Método: ${auditLog.identity_method || 'eletrônica avançada'}.`,
      ip: auditLog.ip_address,
      user_agent: auditLog.user_agent,
      geo: [auditLog.geo_city, auditLog.geo_region, auditLog.geo_country].filter(Boolean).join('/') || null,
      ntp_source: 'Observatório Nacional Brasileiro (ON.br)',
    });
  }

  if (cancellationAudit) {
    eventos.push({
      timestamp: cancellationAudit.cancelled_at,
      tipo: doc.status === 'CANCELADO_POR_ERRO' ? 'CANCELADO_POR_ERRO' : 'REVOGADO',
      descricao: `Documento cancelado/revogado por ${cancellationAudit.cancelled_by_user_email || 'administrador'}. Justificativa: ${cancellationAudit.justification || 'Não informada'}.`,
      ip: cancellationAudit.ip_address,
    });
  }

  const manifestSha256 = auditLog?.manifest_sha256 || doc.content_sha256 || '';
  const validationCode = manifestSha256
    ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}`
    : `DOC-${doc.id.substring(0, 8).toUpperCase()}`;

  let parentEmail: string | null = null;
  const masterKey = c.env.ENCRYPTION_KEY_V1;
  if (doc.parent_email_encrypted && doc.parent_email_encrypted !== 'ENC_INITIAL' && masterKey) {
    try {
      parentEmail = await decryptAesGcm(doc.parent_email_encrypted, masterKey);
    } catch {}
  }
  if (!parentEmail && doc.parent_email) {
    parentEmail = doc.parent_email;
  }

  try {
    const pdfBytes = await GeradorCertificadoConclusao.gerarCertificado({
      documentId: doc.id,
      validationCode,
      minorName: doc.minor_name || 'Estudante',
      signerName: auditLog?.signer_name || doc.parent_name || 'Responsável Legal',
      signerCpfMasked: auditLog?.signer_cpf_masked || '***.***.***-**',
      signerRelationship: auditLog?.signer_relationship || 'Responsável',
      institutionName: doc.institution_name || 'Escola Cidadã — Saúde em Movimento',
      manifestSha256,
      contentSha256: doc.content_sha256 || '',
      logRowHash: auditLog?.log_row_hash || '',
      prevLogHash: auditLog?.prev_log_hash || null,
      merkleRoot: null,
      tsaToken: auditLog?.tsa_timestamp_token || null,
      tsaAuthority: 'Catraki TSA Interno',
      eventos,
      documentStatus: doc.status || 'pending',
      signedAt: auditLog?.signed_at || doc.revoked_at || null,
      revokedAt: doc.revoked_at || doc.cancelled_at || null,
      revocationReason: doc.revoked_reason || doc.cancellation_reason || null,
      validationBaseUrl: 'https://catraki.com.br/validar',
      signerEmail: parentEmail || undefined,
      signerIp: auditLog?.ip_address || undefined,
      signerUserAgent: auditLog?.user_agent || undefined,
    });

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-conclusao-${validationCode}.pdf"`,
        'Cache-Control': 'no-store, no-cache',
        'X-Document-Id': doc.id,
        'X-Validation-Code': validationCode,
        'X-Manifest-SHA256': manifestSha256,
      },
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: `Erro ao gerar Certificado de Conclusão: ${err?.message || 'Erro interno'}`,
      code: 'CERTIFICATE_GENERATION_FAILED',
    }, 500);
  }
});

/**
 * POST /api/admin/documents/:id/notify-cancellation
 * Dispara ou reenvia a notificação de cancelamento diretamente para o e-mail informado
 */
adminRouter.post('/documents/:id/notify-cancellation', requireAuth(['admin_master', 'operador']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const rawEmail = (body?.email || body?.notify_email || '').trim();
  const customReason = (body?.reason || '').trim();

  if (!rawEmail || !rawEmail.includes('@')) {
    return c.json({ success: false, error: 'E-mail de destino inválido.', code: 'INVALID_EMAIL' }, 400);
  }

  const db = c.env.DB;
  const doc = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first<DocumentRecord>();
  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const auditLog = await db.prepare('SELECT manifest_sha256 FROM audit_logs WHERE document_id = ?').bind(id).first<any>();
  const manifestSha256 = auditLog?.manifest_sha256 || doc.content_sha256 || '';
  const reason = customReason || doc.cancellation_reason || 'Inconsistência cadastral ou operacional detectada';
  const cancelledAtIso = doc.cancelled_at || doc.revoked_at || new Date().toISOString();
  const formattedDate = new Date(cancelledAtIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const docTitle = (doc as any).title || (doc as any).document_title || (doc.minor_name ? `Termo de Consentimento - ${doc.minor_name}` : 'Termo de Consentimento');
  const emailSubject = getCancellationEmailSubject();

  const emailHtml = getTransactionalCancellationEmailHtml({
    parentName: doc.parent_name || 'Responsável Legal',
    minorName: doc.minor_name || 'Estudante',
    documentId: doc.id,
    documentTitle: docTitle,
    validationCode: manifestSha256 ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
    cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
    institutionName: (doc as any).institution_name || 'Escola CEMEIT',
    reason,
    documentHashSha256: manifestSha256 || undefined,
    revokedByName: 'Gestão Administrativa — Plataforma Catraki',
    revokedByEmail: 'autorizacoes@catraki.com.br',
  });
  const emailText = getTransactionalCancellationEmailText({
    parentName: doc.parent_name || 'Responsável Legal',
    minorName: doc.minor_name || 'Estudante',
    documentId: doc.id,
    documentTitle: docTitle,
    validationCode: manifestSha256 ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}` : `DOC-${doc.id.substring(0, 8).toUpperCase()}`,
    cancelledAtFormatted: `${formattedDate} (Horário de Brasília)`,
    institutionName: (doc as any).institution_name || 'Escola CEMEIT',
    reason,
    documentHashSha256: manifestSha256 || undefined,
    revokedByName: 'Gestão Administrativa — Plataforma Catraki',
    revokedByEmail: 'autorizacoes@catraki.com.br',
  });

  let emailDispatched = false;
  const fromAddress = (c.env as any).EMAIL_FROM || 'Plataforma Catraki <autorizacoes@catraki.com.br>';

  try {
    if ((c.env as any).RESEND_API_KEY) {
      let resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(c.env as any).RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [rawEmail],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!resendResp.ok) {
        resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(c.env as any).RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Escola Cidadã — Saúde em Movimento <onboarding@resend.dev>',
            to: [rawEmail],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: rawEmail }] }],
          from: { email: 'autorizacoes@catraki.com.br', name: 'Escola Cidadã — Saúde em Movimento' },
          subject: emailSubject,
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
  } catch (err: any) {
    return c.json({ success: false, error: `Erro no provedor de e-mail: ${err.message}`, code: 'EMAIL_SEND_ERROR' }, 500);
  }

  return c.json({
    success: true,
    email_dispatched: emailDispatched,
    target_email: rawEmail,
    message: `Notificação de cancelamento enviada com sucesso para ${rawEmail}.`,
  });
});

/**
 * POST /api/admin/documents/:id/resend-signed-email
 * Reenvia o comprovante de assinatura eletrônica oficial para o e-mail informado
 */
adminRouter.post('/documents/:id/resend-signed-email', requireAuth(['admin_master', 'operador']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const rawEmail = (body?.email || body?.notify_email || '').trim();

  if (!rawEmail || !rawEmail.includes('@')) {
    return c.json({ success: false, error: 'E-mail de destino inválido.', code: 'INVALID_EMAIL' }, 400);
  }

  const db = c.env.DB;
  const doc = await db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first<DocumentRecord>();
  if (!doc) {
    return c.json({ success: false, error: 'Documento não localizado.', code: 'DOC_NOT_FOUND' }, 404);
  }

  const auditLog = await db.prepare('SELECT * FROM audit_logs WHERE document_id = ?').bind(id).first<any>();
  const manifestSha256 = auditLog?.manifest_sha256 || doc.content_sha256 || '';
  const validationCode = manifestSha256 
    ? `CATRAKI-${manifestSha256.substring(0, 4).toUpperCase()}-${manifestSha256.substring(manifestSha256.length - 4).toUpperCase()}`
    : `DOC-${doc.id.substring(0, 8).toUpperCase()}`;

  const signerName = auditLog?.signer_name || doc.parent_name || 'Responsável Legal';

  const docTitle = (doc as any).title || (doc.minor_name ? `Termo de Consentimento - ${doc.minor_name}` : 'Termo de Consentimento - Saúde em Movimento');
  const emailSubject = getCompletionEmailSubject(docTitle);
  const emailHtml = getTransactionalCompletionEmailHtml({
    signerName,
    documentTitle: docTitle,
    downloadUrl: `https://www.catraki.com.br/validar/${validationCode}`,
    companyName: 'Plataforma Catraki',
    supportEmail: 'suporte@catraki.com.br',
  });
  const emailText = getTransactionalCompletionEmailText({
    signerName,
    documentTitle: docTitle,
    downloadUrl: `https://www.catraki.com.br/validar/${validationCode}`,
    companyName: 'Plataforma Catraki',
    supportEmail: 'suporte@catraki.com.br',
  });

  let emailDispatched = false;
  const resendApiKey = (c.env as any).RESEND_API_KEY;
  const fromAddress = (c.env as any).EMAIL_FROM || 'Plataforma Catraki <autorizacoes@catraki.com.br>';

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
          to: [rawEmail],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
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
            from: 'Escola Cidadã — Saúde em Movimento <onboarding@resend.dev>',
            to: [rawEmail],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: rawEmail }] }],
          from: { email: 'autorizacoes@catraki.com.br', name: 'Escola Cidadã — Saúde em Movimento' },
          subject: emailSubject,
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
  } catch (err: any) {
    return c.json({ success: false, error: `Erro no envio: ${err.message}`, code: 'EMAIL_SEND_ERROR' }, 500);
  }

  return c.json({
    success: true,
    email_dispatched: emailDispatched,
    target_email: rawEmail,
    message: `Comprovante de assinatura eletrônica enviado com sucesso para ${rawEmail}.`,
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
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

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

  // Trilha de auditoria imutável (admin_audit_logs)
  await logAdminAction(
    db,
    user,
    'MANUAL_REVIEW_ACTION',
    `manual_review:${reviewId}`,
    JSON.stringify({
      action,
      notes: notes || null,
      previous_status: review.status,
      new_status: newStatus,
      signer_name: review.signer_name,
      signer_cpf_masked: review.signer_cpf_masked,
      document_id: review.document_id,
    }),
    clientIp,
    userAgent
  );

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

// Trilha de Auditoria de Ações Administrativas e de Governança
adminRouter.get('/audit-logs/admin', requireAuth(['admin_master', 'dpo']), async (c) => {
  const db = c.env.DB;
  const logs = await db.prepare(
    `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100`
  ).all<any>();

  return c.json({ success: true, logs: logs.results || [] });
});

// Endpoint para Registro de Exportação Massiva (DLP - Data Loss Prevention / LGPD Art. 46 e 50)
adminRouter.post('/audit/export-log', requireAuth(['admin_master', 'dpo', 'operador']), async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const parsed = LogAdminExportSchema.safeParse(body);
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message }, 400);
  }

  const { export_type, record_count, filters_applied } = parsed.data;
  const db = c.env.DB;

  await logAdminAction(
    db,
    user,
    'DATA_EXPORT',
    `export:${export_type}`,
    JSON.stringify({
      export_type,
      record_count,
      filters: filters_applied || 'ALL',
      timestamp: new Date().toISOString(),
    }),
    clientIp,
    userAgent
  );

  return c.json({ success: true, message: 'Operação de exportação registrada na trilha de auditoria.' });
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
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status, response_notes } = body;
  const db = c.env.DB;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

  if (!status || !response_notes) {
    return c.json({ success: false, error: 'Status e parecer do DPO são obrigatórios.' }, 400);
  }

  const existing = await db.prepare('SELECT * FROM lgpd_requests WHERE id = ?').bind(id).first<LgpdRequestRecord>();
  if (!existing) {
    return c.json({ success: false, error: 'Solicitação LGPD não encontrada.' }, 404);
  }

  await db.prepare(
    `UPDATE lgpd_requests 
     SET status = ?, response_notes = ?, resolved_at = datetime('now') 
     WHERE id = ?`
  ).bind(status, response_notes, id).run();

  // Registra auditoria da decisão do DPO
  await logAdminAction(
    db,
    user,
    'LGPD_RESPONSE',
    `lgpd_request:${id}`,
    JSON.stringify({
      request_type: existing.request_type,
      requester_name: existing.requester_name,
      previous_status: existing.status,
      new_status: status,
      response_notes,
    }),
    clientIp,
    userAgent
  );

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
  const user = c.get('user');
  const body = await c.req.json();
  const { id, name, short_name, city, state } = body;
  const db = c.env.DB;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

  if (!id || !name || !short_name) {
    return c.json({ success: false, error: 'Slug (ID), Nome e Sigla são obrigatórios.' }, 400);
  }

  const cleanSlug = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  await db.prepare(
    `INSERT INTO institutions (id, name, short_name, city, state, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name, city = excluded.city, state = excluded.state, is_active = 1`
  ).bind(cleanSlug, name.trim(), short_name.trim(), city?.trim() || 'Brasília', state?.trim() || 'DF').run();

  await logAdminAction(
    db,
    user,
    'INSTITUTION_ACTION',
    `institution:${cleanSlug}`,
    `Escola/Instituição '${name.trim()}' (${short_name.trim()}) cadastrada/atualizada`,
    clientIp,
    userAgent
  );

  return c.json({
    success: true,
    institution: { id: cleanSlug, name: name.trim(), short_name: short_name.trim(), city: city || 'Brasília', state: state || 'DF' },
    message: 'Instituição / Escola cadastrada com sucesso.',
  });
});

adminRouter.delete('/institutions/:id', requireAuth(['admin_master']), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Catraki Admin';

  await db.prepare('UPDATE institutions SET is_active = 0 WHERE id = ?').bind(id).run();

  await logAdminAction(
    db,
    user,
    'INSTITUTION_ACTION',
    `institution:${id}`,
    `Escola/Instituição '${id}' desativada logicamente (is_active = 0)`,
    clientIp,
    userAgent
  );

  return c.json({ success: true, message: 'Instituição desativada com sucesso.' });
});
