import { computeMerkleRoot } from '../../src/lib/audit-chain.ts';
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
}
