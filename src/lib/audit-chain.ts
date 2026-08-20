// ============================================================================
// CADEIA DE AUDITORIA CRIPTOGRÁFICA (HASH CHAIN & MERKLE TREE)
// Garante não-repúdio, integridade matemática e auditabilidade forense
// ============================================================================

import { sha256, canonicalJson } from './crypto.ts';
import type { AuditLogRow, AuditLogRowInput, ChainVerificationResult } from './types.ts';

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computa o hash criptográfico determinístico da linha do log de auditoria
 */
export async function computeLogRowHash(input: AuditLogRowInput): Promise<string> {
  const payloadToHash = {
    id: input.id,
    document_id: input.document_id,
    prev_log_hash: input.prev_log_hash || GENESIS_PREV_HASH,
    signed_at: input.signed_at,
    signer_name: input.signer_name,
    signer_cpf_masked: input.signer_cpf_masked,
    signer_relationship: input.signer_relationship,
    identity_method: input.identity_method,
    signature_png_sha256: input.signature_png_sha256,
    ip_address: input.ip_address,
    user_agent: input.user_agent,
    client_fingerprint: input.client_fingerprint || null,
    content_sha256_at_signing: input.content_sha256_at_signing,
    consent_text_version: input.consent_text_version,
    manifest_sha256: input.manifest_sha256,
    tsa_timestamp_token: input.tsa_timestamp_token ? await sha256(input.tsa_timestamp_token) : null,
  };

  const canonicalString = canonicalJson(payloadToHash);
  return await sha256(canonicalString);
}

/**
 * Computa a Raiz de Merkle (Merkle Root) de uma lista de hashes
 */
export async function computeMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) {
    return await sha256('EMPTY_SESI_AUDIT_LOG');
  }
  if (hashes.length === 1) {
    return hashes[0];
  }

  let currentLevel = [...hashes];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // Se houver número ímpar, duplica o último elemento conforme padrão Bitcoin/Merkle
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combinedHash = await sha256(left + right);
      nextLevel.push(combinedHash);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Verifica a integridade da Hash Chain completa
 */
export async function verifyAuditChain(rows: AuditLogRow[]): Promise<ChainVerificationResult> {
  if (!rows || rows.length === 0) {
    return {
      isValid: true,
      totalBlocks: 0,
      merkleRoot: await sha256('EMPTY_CHAIN'),
    };
  }

  // Ordena cronologicamente por created_at / signed_at
  const sortedRows = [...rows].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let expectedPrevHash: string | null = null;
  const validHashes: string[] = [];

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i];

    // 1. Verificação do encadeamento (prev_log_hash)
    if (i === 0) {
      // Primeiro nó (Gênesis)
      if (row.prev_log_hash !== null && row.prev_log_hash !== GENESIS_PREV_HASH) {
        return {
          isValid: false,
          totalBlocks: sortedRows.length,
          corruptedBlockIndex: 0,
          corruptedBlockId: row.id,
          error: `Bloco Gênesis (ID: ${row.id}) possui prev_log_hash inválido: ${row.prev_log_hash}`,
          merkleRoot: '',
        };
      }
    } else {
      if (row.prev_log_hash !== expectedPrevHash) {
        return {
          isValid: false,
          totalBlocks: sortedRows.length,
          corruptedBlockIndex: i,
          corruptedBlockId: row.id,
          error: `Quebra de elo no Bloco ${i} (ID: ${row.id}). Esperado prev_log_hash: ${expectedPrevHash}, Encontrado: ${row.prev_log_hash}`,
          merkleRoot: '',
        };
      }
    }

    // 2. Recálculo e verificação do hash intrínseco do registro
    const input: AuditLogRowInput = {
      id: row.id,
      document_id: row.document_id,
      prev_log_hash: row.prev_log_hash,
      signed_at: row.signed_at,
      signer_name: row.signer_name,
      signer_cpf_masked: row.signer_cpf_masked,
      signer_relationship: row.signer_relationship,
      identity_method: row.identity_method,
      signature_png_sha256: row.signature_png_sha256,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      client_fingerprint: row.client_fingerprint,
      content_sha256_at_signing: row.content_sha256_at_signing,
      consent_text_version: row.consent_text_version,
      manifest_sha256: row.manifest_sha256,
      tsa_timestamp_token: row.tsa_timestamp_token,
    };

    const recomputedHash = await computeLogRowHash(input);

    if (recomputedHash !== row.log_row_hash) {
      return {
        isValid: false,
        totalBlocks: sortedRows.length,
        corruptedBlockIndex: i,
        corruptedBlockId: row.id,
        error: `Adulteração detectada no Bloco ${i} (ID: ${row.id}). Hash gravado: ${row.log_row_hash}, Hash recalculado: ${recomputedHash}`,
        merkleRoot: '',
      };
    }

    validHashes.push(row.log_row_hash);
    expectedPrevHash = row.log_row_hash;
  }

  const merkleRoot = await computeMerkleRoot(validHashes);

  return {
    isValid: true,
    totalBlocks: sortedRows.length,
    merkleRoot,
  };
}
