import { decryptAesGcm, hmacSha256, sha256, canonicalJson } from '../../src/lib/crypto.ts';
import { isValidCPF, maskCPF, maskEmail } from '../../src/lib/schemas.ts';
import type { Env } from '../../src/lib/types.ts';
import type { JwtPayload } from '../middleware/auth.ts';

export interface NormalizedIdentifier {
  type: 'cpf' | 'email';
  normalized: string;
  masked: string;
}

export function normalizeTitularIdentifier(raw: string): NormalizedIdentifier | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return {
      type: 'email',
      normalized: email,
      masked: maskEmail(email),
    };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && isValidCPF(digits)) {
    return {
      type: 'cpf',
      normalized: digits,
      masked: maskCPF(digits),
    };
  }

  return null;
}

async function safeDecrypt(cipher: string | null | undefined, masterKey: string): Promise<string | null> {
  if (!cipher || cipher === 'ANONIMIZADO' || cipher === 'ANONIMIZADO_LGPD') return cipher || null;
  try {
    return await decryptAesGcm(cipher, masterKey);
  } catch {
    return null;
  }
}

async function recordLgpdAdminAudit(
  db: D1Database,
  actor: Pick<JwtPayload, 'sub' | 'email' | 'role'>,
  eventType: 'LGPD_DATA_EXPORT' | 'LGPD_DATA_ANONYMIZATION',
  targetResource: string,
  details: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const id = `ADM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const actionDetails = JSON.stringify(details);
  const logHash = await sha256(
    canonicalJson({
      id,
      event_type: eventType,
      actor_user_id: actor.sub,
      target_resource: targetResource,
      action_details: actionDetails,
    })
  );

  await db
    .prepare(
      `INSERT INTO admin_audit_logs (
        id, event_type, actor_user_id, actor_user_email, actor_user_role,
        ip_address, user_agent, target_resource, action_details, log_row_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      id,
      eventType,
      actor.sub,
      actor.email,
      actor.role,
      ipAddress,
      userAgent,
      targetResource,
      actionDetails,
      logHash
    )
    .run()
    .catch((err) => {
      console.error(`[LGPD_AUDIT_ERROR] Falha ao gravar ${eventType}:`, err);
    });
}

async function findMatchingRecords(
  db: D1Database,
  env: Partial<Env>,
  identifier: NormalizedIdentifier
): Promise<{ documents: any[]; auditLogs: any[]; lgpdRequests: any[]; bindex: string }> {
  const pepper = env.OTP_PEPPER || '';
  const masterKey = env.ENCRYPTION_KEY_V1 || '';
  const bindex = pepper ? await hmacSha256(identifier.normalized, pepper) : '';

  let documents: any[] = [];
  if (identifier.type === 'cpf') {
    const res = await db
      .prepare(
        `SELECT * FROM documents
         WHERE minor_cpf_bindex_sha256 = ?
            OR signer_cpf_bindex_sha256 = ?
            OR minor_cpf = ?
         ORDER BY created_at DESC`
      )
      .bind(bindex, bindex, identifier.masked)
      .all<any>();
    documents = res.results || [];
  } else {
    const res = await db
      .prepare(
        `SELECT * FROM documents
         WHERE parent_email_bindex_sha256 = ?
         ORDER BY created_at DESC`
      )
      .bind(bindex)
      .all<any>();
    documents = res.results || [];
  }

  // Fallback para registros legados de audit_logs pelo CPF mascarado + confirmação AES-GCM
  const docMap = new Map<string, any>();
  for (const d of documents) docMap.set(d.id, d);

  let auditLogs: any[] = [];
  const docIds = Array.from(docMap.keys());
  if (docIds.length > 0) {
    const placeholders = docIds.map(() => '?').join(', ');
    const audRes = await db
      .prepare(`SELECT * FROM audit_logs WHERE document_id IN (${placeholders}) ORDER BY signed_at DESC`)
      .bind(...docIds)
      .all<any>();
    auditLogs = audRes.results || [];
  }

  if (identifier.type === 'cpf' && masterKey) {
    const legacyAudRes = await db
      .prepare(`SELECT * FROM audit_logs WHERE signer_cpf_masked = ? ORDER BY signed_at DESC`)
      .bind(identifier.masked)
      .all<any>();
    for (const row of legacyAudRes.results || []) {
      const decryptedCpf = await safeDecrypt(row.signer_cpf_encrypted, masterKey);
      const cleanDecrypted = decryptedCpf ? decryptedCpf.replace(/\D/g, '') : '';
      if (cleanDecrypted === identifier.normalized) {
        if (!auditLogs.some((a) => a.id === row.id)) {
          auditLogs.push(row);
        }
        if (!docMap.has(row.document_id)) {
          const extraDoc = await db
            .prepare(`SELECT * FROM documents WHERE id = ?`)
            .bind(row.document_id)
            .first<any>();
          if (extraDoc) {
            docMap.set(extraDoc.id, extraDoc);
            documents.push(extraDoc);
          }
        }
      }
    }
  }

  let lgpdRequests: any[] = [];
  if (bindex) {
    const reqRes = await db
      .prepare(
        `SELECT * FROM lgpd_requests
         WHERE requester_cpf_bindex_sha256 = ?
            OR requester_email_bindex_sha256 = ?
         ORDER BY created_at DESC`
      )
      .bind(bindex, bindex)
      .all<any>();
    lgpdRequests = reqRes.results || [];
  }

  return { documents, auditLogs, lgpdRequests, bindex };
}

/**
 * Exporta todos os dados pessoais vinculados a um titular a partir do e-mail ou CPF (LGPD Art. 18, II e V).
 */
export async function exportTitularDataByIdentifier(
  db: D1Database,
  env: Partial<Env>,
  rawIdentifier: string,
  actor: Pick<JwtPayload, 'sub' | 'email' | 'role'>,
  ipAddress = '127.0.0.1',
  userAgent = 'Catraki-Admin'
) {
  const identifier = normalizeTitularIdentifier(rawIdentifier);
  if (!identifier) {
    throw new Error('Identificador inválido. Informe um CPF válido (11 dígitos) ou um e-mail válido.');
  }

  const masterKey = env.ENCRYPTION_KEY_V1 || '';
  const { documents, auditLogs, lgpdRequests, bindex } = await findMatchingRecords(db, env, identifier);

  const exportedDocuments = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      status: doc.status,
      institution_id: doc.institution_id,
      institution_name: doc.institution_name,
      template_id: doc.template_id,
      template_version: doc.template_version,
      minor: {
        name: doc.minor_name,
        birth_date: doc.minor_birth_date,
        cpf: masterKey ? await safeDecrypt(doc.minor_cpf_encrypted, masterKey) : doc.minor_cpf || null,
        series: doc.minor_series || null,
        class: doc.minor_class || null,
        turn: doc.minor_turn || null,
      },
      parent_or_signer: {
        name: doc.parent_name || null,
        email: masterKey ? await safeDecrypt(doc.parent_email_encrypted, masterKey) : null,
        phone: masterKey ? await safeDecrypt(doc.parent_phone_encrypted, masterKey) : null,
      },
      consents: {
        auth_health: doc.auth_health,
        auth_data: doc.auth_data,
        auth_image: doc.auth_image,
        terms_version: doc.terms_version,
        privacy_policy_version: doc.privacy_policy_version || null,
        privacy_policy_accepted_at: doc.privacy_policy_accepted_at || null,
      },
      lifecycle: {
        created_at: doc.created_at,
        expires_at: doc.expires_at,
        retention_expires_at: doc.retention_expires_at,
        revoked_at: doc.revoked_at || null,
        revoked_reason: doc.revoked_reason || null,
        cancelled_at: doc.cancelled_at || null,
        cancellation_reason: doc.cancellation_reason || null,
      },
    }))
  );

  const exportedAuditLogs = await Promise.all(
    auditLogs.map(async (log) => ({
      id: log.id,
      document_id: log.document_id,
      signed_at: log.signed_at,
      signer_name: log.signer_name,
      signer_cpf: masterKey ? await safeDecrypt(log.signer_cpf_encrypted, masterKey) : log.signer_cpf_masked,
      signer_relationship: log.signer_relationship,
      identity_method: log.identity_method,
      ip_address: log.ip_address,
      geo_city: log.geo_city || null,
      geo_region: log.geo_region || null,
      geo_country: log.geo_country || null,
      manifest_sha256: log.manifest_sha256,
      log_row_hash: log.log_row_hash,
      signature_png_sha256: log.signature_png_sha256,
    }))
  );

  const exportedLgpdRequests = await Promise.all(
    lgpdRequests.map(async (req) => ({
      id: req.id,
      requester_name: req.requester_name,
      requester_cpf_masked: req.requester_cpf_masked,
      requester_email: masterKey ? await safeDecrypt(req.requester_email_encrypted, masterKey) : null,
      request_type: req.request_type,
      details: req.details,
      status: req.status,
      response_notes: req.response_notes || null,
      privacy_policy_version: req.privacy_policy_version || null,
      privacy_policy_accepted_at: req.privacy_policy_accepted_at || null,
      response_deadline_at: req.response_deadline_at || null,
      created_at: req.created_at,
      resolved_at: req.resolved_at || null,
    }))
  );

  await recordLgpdAdminAudit(
    db,
    actor,
    'LGPD_DATA_EXPORT',
    `titular:${identifier.type}:${bindex.slice(0, 16) || 'no-pepper'}`,
    {
      query_type: identifier.type,
      identifier_masked: identifier.masked,
      documents_count: exportedDocuments.length,
      audit_logs_count: exportedAuditLogs.length,
      lgpd_requests_count: exportedLgpdRequests.length,
    },
    ipAddress,
    userAgent
  );

  return {
    exported_at: new Date().toISOString(),
    legal_basis: 'LGPD (Lei 13.709/2018) Art. 18, II e V (Acesso e Portabilidade) — Prazo legal de 15 dias (Art. 19, II)',
    query_type: identifier.type,
    identifier_masked: identifier.masked,
    summary: {
      total_documents: exportedDocuments.length,
      total_audit_logs: exportedAuditLogs.length,
      total_lgpd_requests: exportedLgpdRequests.length,
    },
    documents: exportedDocuments,
    audit_logs: exportedAuditLogs,
    lgpd_requests: exportedLgpdRequests,
  };
}

/**
 * Anonimiza os dados pessoais do titular por e-mail ou CPF sem quebrar o histórico obrigatório
 * (preserva integridade referencial, estatísticas e a Hash Chain imutável em audit_logs).
 */
export async function anonymizeTitularDataByIdentifier(
  db: D1Database,
  env: Partial<Env>,
  rawIdentifier: string,
  reason: string,
  actor: Pick<JwtPayload, 'sub' | 'email' | 'role'>,
  ipAddress = '127.0.0.1',
  userAgent = 'Catraki-Admin'
) {
  const identifier = normalizeTitularIdentifier(rawIdentifier);
  if (!identifier) {
    throw new Error('Identificador inválido. Informe um CPF válido (11 dígitos) ou um e-mail válido.');
  }

  const cleanReason = (reason || '').trim() || 'Solicitação de eliminação/anonimização pelo titular (LGPD Art. 18, VI)';
  const { documents, auditLogs, lgpdRequests, bindex } = await findMatchingRecords(db, env, identifier);

  let documentsAnonymized = 0;
  let documentsAlreadyAnonymized = 0;
  const anonymizedDocIds: string[] = [];

  for (const doc of documents) {
    if (typeof doc.minor_name === 'string' && doc.minor_name.startsWith('ANONIMIZADO_LGPD')) {
      documentsAlreadyAnonymized++;
      continue;
    }

    const isPendingOrDraft = doc.status === 'pending' || doc.status === 'draft';
    if (isPendingOrDraft) {
      await db
        .prepare(
          `UPDATE documents
           SET minor_name = 'ANONIMIZADO_LGPD_' || substr(id, 1, 8),
               minor_birth_date = 'ANONIMIZADO',
               minor_series = NULL,
               minor_class = NULL,
               minor_turn = NULL,
               parent_name = 'ANONIMIZADO_LGPD',
               parent_email_encrypted = 'ANONIMIZADO',
               parent_phone_encrypted = 'ANONIMIZADO',
               parent_email_bindex_sha256 = NULL,
               minor_cpf_encrypted = NULL,
               minor_cpf_bindex_sha256 = NULL,
               signer_cpf_bindex_sha256 = NULL,
               minor_cpf = NULL,
               status = 'cancelled_error',
               cancelled_at = datetime('now'),
               cancelled_by_admin_id = ?,
               cancellation_reason = ?,
               cancellation_ip = ?
           WHERE id = ?`
        )
        .bind(actor.sub, `[LGPD] ${cleanReason}`, ipAddress, doc.id)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE documents
           SET minor_name = 'ANONIMIZADO_LGPD_' || substr(id, 1, 8),
               minor_birth_date = 'ANONIMIZADO',
               minor_series = NULL,
               minor_class = NULL,
               minor_turn = NULL,
               parent_name = 'ANONIMIZADO_LGPD',
               parent_email_encrypted = 'ANONIMIZADO',
               parent_phone_encrypted = 'ANONIMIZADO',
               parent_email_bindex_sha256 = NULL,
               minor_cpf_encrypted = NULL,
               minor_cpf_bindex_sha256 = NULL,
               signer_cpf_bindex_sha256 = NULL,
               minor_cpf = NULL
           WHERE id = ?`
        )
        .bind(doc.id)
        .run();
    }

    documentsAnonymized++;
    anonymizedDocIds.push(doc.id);
  }

  let lgpdRequestsAnonymized = 0;
  for (const req of lgpdRequests) {
    if (req.requester_name === 'ANONIMIZADO_LGPD') continue;
    await db
      .prepare(
        `UPDATE lgpd_requests
         SET requester_name = 'ANONIMIZADO_LGPD',
             requester_cpf_masked = '***.***.***-**',
             requester_cpf_bindex_sha256 = NULL,
             requester_email_encrypted = 'ANONIMIZADO',
             requester_email_bindex_sha256 = NULL
         WHERE id = ?`
      )
      .bind(req.id)
      .run();
    lgpdRequestsAnonymized++;
  }

  await recordLgpdAdminAudit(
    db,
    actor,
    'LGPD_DATA_ANONYMIZATION',
    `titular:${identifier.type}:${bindex.slice(0, 16) || 'no-pepper'}`,
    {
      query_type: identifier.type,
      identifier_masked: identifier.masked,
      reason: cleanReason,
      documents_anonymized: documentsAnonymized,
      documents_already_anonymized: documentsAlreadyAnonymized,
      audit_logs_preserved: auditLogs.length,
      lgpd_requests_anonymized: lgpdRequestsAnonymized,
    },
    ipAddress,
    userAgent
  );

  return {
    executed_at: new Date().toISOString(),
    query_type: identifier.type,
    identifier_masked: identifier.masked,
    documents_anonymized: documentsAnonymized,
    documents_already_anonymized: documentsAlreadyAnonymized,
    anonymized_document_ids: anonymizedDocIds,
    audit_logs_preserved_for_legal_compliance: auditLogs.length,
    lgpd_requests_anonymized: lgpdRequestsAnonymized,
    legal_note:
      'Os dados cadastrais identificáveis foram anonimizados preservando a integridade referencial e a trilha criptográfica imutável (Hash Chain em audit_logs), conforme Art. 16, I da LGPD e Lei nº 14.063/2020.',
  };
}
