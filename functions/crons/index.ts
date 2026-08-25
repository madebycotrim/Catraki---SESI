import { computeMerkleRoot } from '../../src/lib/audit-chain.ts';
import { verifyDocumentIntegrity } from '../../src/lib/crypto.ts';
import type { Env } from '../../src/lib/types.ts';

/**
 * Tratamento de tarefas agendadas (Cloudflare Cron Triggers)
 * - Expiração de termos pendentes
 * - Alertas 48h antes do vencimento
 * - Expurgo e anonimização de dados pessoais (LGPD) após término do prazo de retenção
 * - Cálculo e ancoragem da Raiz de Merkle da trilha de auditoria
 */
export async function handleScheduled(
  _event: any,
  env: Env,
  _ctx: any
): Promise<void> {
  const db = env.DB;

  // 1. Expiração de Termos Vencidos
  try {
    const expireResult = await db.prepare(
      `UPDATE documents 
       SET status = 'expired' 
       WHERE status = 'pending' AND expires_at < datetime('now')`
    ).run();

    console.log(`[CRON] Termos expirados atualizados: ${expireResult.meta?.changes || 0}`);
  } catch (err) {
    console.error('[CRON] Erro ao expirar termos:', err);
  }

  // 2. Expurgo e Anonimização de Dados Pessoais (LGPD Art. 16 / Retenção Específica)
  try {
    const docsToAnonymize = await db.prepare(
      `SELECT id FROM documents 
       WHERE retention_expires_at < datetime('now') 
         AND minor_name NOT LIKE 'ANONIMIZADO_LGPD%'`
    ).all<{ id: string }>();

    const expiredDocs = docsToAnonymize.results || [];
    for (const doc of expiredDocs) {
      await db.prepare(
        `UPDATE documents 
         SET minor_name = 'ANONIMIZADO_LGPD_' || substr(id, 1, 8),
             minor_birth_date = '1900-01-01',
             parent_name = 'ANONIMIZADO_LGPD',
             parent_email_encrypted = 'ANONIMIZADO',
             parent_phone_encrypted = 'ANONIMIZADO'
         WHERE id = ?`
      ).bind(doc.id).run();
    }

    if (expiredDocs.length > 0) {
      console.log(`[CRON] Documentos com dados pessoais anonimizados por retenção LGPD: ${expiredDocs.length}`);
    }
  } catch (err) {
    console.error('[CRON] Erro no expurgo por retenção LGPD:', err);
  }

  // 3. Cálculo da Raiz de Merkle Diária para Publicação/Ancoragem
  try {
    const logs = await db.prepare(
      `SELECT log_row_hash FROM audit_logs ORDER BY created_at ASC`
    ).all<{ log_row_hash: string }>();

    const hashes = (logs.results || []).map((r) => r.log_row_hash);
    if (hashes.length > 0) {
      const merkleRoot = await computeMerkleRoot(hashes);
      const anchorId = `ANCHOR-${Date.now()}`;

      await db.prepare(
        `INSERT INTO merkle_roots_anchors (
          id, period_start, period_end, row_count, merkle_root_sha256, anchor_target, anchor_reference, created_at
        ) VALUES (?, datetime('now', '-1 day'), datetime('now'), ?, ?, 'GIT_COMMIT_IMMUTABLE_LOG', ?, datetime('now'))`
      ).bind(anchorId, hashes.length, merkleRoot, `merkle-tree-root-${merkleRoot.substring(0, 16)}`).run();

      console.log(`[CRON] Raiz de Merkle ancorada com sucesso: ${merkleRoot} (${hashes.length} registros)`);
    }
  } catch (err) {
    console.error('[CRON] Erro na ancoragem da raiz de Merkle:', err);
  }

  // 4. Expurgo de Documentos Biométricos (Fotos/Selfies em R2) de Revisões Concluídas há mais de 30 dias (LGPD Art. 16)
  const bucket = env.BUCKET_DOCS;
  if (bucket) {
    try {
      const resolvedReviews = await db.prepare(
        `SELECT id, identity_doc_r2_key, selfie_doc_r2_key, guardianship_doc_r2_key 
         FROM manual_review_queue 
         WHERE status IN ('approved', 'rejected') 
           AND updated_at < datetime('now', '-30 days')
           AND identity_doc_r2_key NOT LIKE 'EXPURGADO%'`
      ).all<any>();

      const reviewsToPurge = resolvedReviews.results || [];
      for (const rev of reviewsToPurge) {
        if (rev.identity_doc_r2_key && !rev.identity_doc_r2_key.startsWith('EXPURGADO')) {
          try { await bucket.delete(rev.identity_doc_r2_key); } catch {}
        }
        if (rev.selfie_doc_r2_key && !rev.selfie_doc_r2_key.startsWith('EXPURGADO')) {
          try { await bucket.delete(rev.selfie_doc_r2_key); } catch {}
        }
        if (rev.guardianship_doc_r2_key && !rev.guardianship_doc_r2_key.startsWith('EXPURGADO')) {
          try { await bucket.delete(rev.guardianship_doc_r2_key); } catch {}
        }

        await db.prepare(
          `UPDATE manual_review_queue 
           SET identity_doc_r2_key = 'EXPURGADO_LGPD', 
               selfie_doc_r2_key = 'EXPURGADO_LGPD', 
               guardianship_doc_r2_key = NULL 
           WHERE id = ?`
        ).bind(rev.id).run();
      }

      if (reviewsToPurge.length > 0) {
        console.log(`[CRON] Revisões manuais com fotos biométricas expurgadas do R2: ${reviewsToPurge.length}`);
      }
    } catch (err) {
      console.error('[CRON] Erro no expurgo de mídias R2:', err);
    }
  }

  // 5. Expurgo Seguro de Registros de Acesso com mais de 180 dias (Marco Civil da Internet Art. 15)
  try {
    const purgeLogsResult = await db.prepare(
      `DELETE FROM application_access_logs WHERE retention_until < datetime('now')`
    ).run();

    if ((purgeLogsResult.meta?.changes || 0) > 0) {
      console.log(`[CRON] Registros de acesso antigos expurgados (Marco Civil Art. 15): ${purgeLogsResult.meta?.changes}`);
    }
  } catch (err) {
    // Tabela pode ainda estar em migração
  }

  // 6. Verificação de Integridade Documental (Lei 14.063/2020 + LGPD Art. 46)
  // Compara o content_sha256 armazenado com o hash do template atual.
  // Se divergir, gera INTEGRITY_ALERT_TAMPERING na trilha de auditoria.
  try {
    const signedDocs = await db.prepare(
      `SELECT d.id, d.content_sha256, d.access_token, t.content_markdown, t.content_sha256 as template_sha256
       FROM documents d
       LEFT JOIN document_templates t ON d.template_id = t.id AND d.template_version = t.version
       WHERE d.status = 'signed'
         AND d.content_sha256 IS NOT NULL
         AND d.integrity_alert_at IS NULL
       LIMIT 100`
    ).all<any>();

    let alertCount = 0;
    for (const doc of (signedDocs.results || [])) {
      const storedHash = doc.content_sha256;
      const currentContent = doc.content_markdown || doc.template_sha256 || '';
      if (!storedHash || !currentContent) continue;

      const integrityResult = await verifyDocumentIntegrity(storedHash, currentContent);

      if (!integrityResult.intact) {
        alertCount++;
        const alertId = `INTEGRITY-${Date.now()}-${doc.id.substring(0, 8)}`;

        // Registra alerta no documento
        await db.prepare(
          `UPDATE documents
           SET integrity_alert_at = datetime('now'),
               integrity_alert_reason = ?
           WHERE id = ?`
        ).bind(integrityResult.alertMessage, doc.id).run().catch(() => {});

        // Registra na trilha de auditoria administrativa
        await db.prepare(
          `INSERT OR IGNORE INTO admin_audit_logs (id, event_type, document_id, description, created_at)
           VALUES (?, 'INTEGRITY_ALERT_TAMPERING', ?, ?, datetime('now'))`
        ).bind(
          alertId,
          doc.id,
          integrityResult.alertMessage || 'Adulteração detectada na verificação periódica de integridade'
        ).run().catch(() => {});

        console.error(`[CRON_INTEGRITY] ADULTERAÇÃO DETECTADA no documento ${doc.id}: ${integrityResult.alertMessage}`);
      }
    }

    if (alertCount > 0) {
      console.error(`[CRON_INTEGRITY] ${alertCount} documentos com suspeita de adulteração detectada. Verifique admin_audit_logs.`);
    } else {
      console.log(`[CRON_INTEGRITY] Verificação de integridade concluída: ${signedDocs.results?.length || 0} documentos íntegros.`);
    }
  } catch (err) {
    console.error('[CRON] Erro na verificação de integridade documental:', err);
  }
}
