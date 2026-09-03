import { describe, it, expect } from 'vitest';
import { computeLogRowHash, verifyAuditChain, computeMerkleRoot } from '../src/lib/audit-chain.ts';
import { sha256 } from '../src/lib/crypto.ts';
import type { AuditLogRow, AuditLogRowInput } from '../src/lib/types.ts';

describe('Cadeia de Auditoria Criptográfica (audit-chain.ts)', () => {
  it('deve computar hash intrínseco de linha de auditoria determinístico', async () => {
    const input: AuditLogRowInput = {
      id: 'AUD-001',
      document_id: 'DOC-001',
      prev_log_hash: null,
      signed_at: '2026-08-19T18:00:00.000Z',
      signer_name: 'Mateus Cotrim',
      signer_cpf_masked: '123.***.***-09',
      signer_relationship: 'Pai',
      identity_method: 'matricula_sesi',
      signature_png_sha256: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ip_address: '189.120.44.12',
      user_agent: 'Mozilla/5.0 Test',
      client_fingerprint: 'fp_test_123',
      content_sha256_at_signing: 'c1d2e3f4a5b678901234567890abcdef1234567890abcdef1234567890abcdef',
      consent_text_version: 1,
      manifest_sha256: 'f1e2d3c4b5a678901234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const hash1 = await computeLogRowHash(input);
    const hash2 = await computeLogRowHash(input);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('deve validar uma Hash Chain sequencial íntegra', async () => {
    // Bloco 1 (Gênesis)
    const block1Input: AuditLogRowInput = {
      id: 'AUD-001',
      document_id: 'DOC-001',
      prev_log_hash: null,
      signed_at: '2026-08-19T10:00:00Z',
      signer_name: 'Mateus Cotrim',
      signer_cpf_masked: '123.***.***-09',
      signer_relationship: 'Pai',
      identity_method: 'matricula_sesi',
      signature_png_sha256: 'sig_hash_1',
      ip_address: '189.120.44.12',
      user_agent: 'Agent 1',
      content_sha256_at_signing: 'content_hash_1',
      consent_text_version: 1,
      manifest_sha256: 'manifest_hash_1',
    };
    const block1Hash = await computeLogRowHash(block1Input);

    const block1: AuditLogRow = {
      ...block1Input,
      prev_log_hash: null,
      signer_cpf_encrypted: 'ENC',
      signature_png_encrypted: 'ENC',
      signer_relationship: 'Pai',
      identity_method: 'matricula_sesi',
      key_version: 1,
      log_row_hash: block1Hash,
      created_at: '2026-08-19T10:00:00Z',
    };

    // Bloco 2 (Encadeado no Bloco 1)
    const block2Input: AuditLogRowInput = {
      id: 'AUD-002',
      document_id: 'DOC-002',
      prev_log_hash: block1Hash,
      signed_at: '2026-08-19T11:00:00Z',
      signer_name: 'Mariana Andrade',
      signer_cpf_masked: '987.***.***-00',
      signer_relationship: 'Mãe',
      identity_method: 'matricula_sesi',
      signature_png_sha256: 'sig_hash_2',
      ip_address: '189.120.44.13',
      user_agent: 'Agent 2',
      content_sha256_at_signing: 'content_hash_2',
      consent_text_version: 1,
      manifest_sha256: 'manifest_hash_2',
    };
    const block2Hash = await computeLogRowHash(block2Input);

    const block2: AuditLogRow = {
      ...block2Input,
      prev_log_hash: block1Hash,
      signer_cpf_encrypted: 'ENC',
      signature_png_encrypted: 'ENC',
      signer_relationship: 'Mãe',
      identity_method: 'matricula_sesi',
      key_version: 1,
      log_row_hash: block2Hash,
      created_at: '2026-08-19T11:00:00Z',
    };

    const result = await verifyAuditChain([block1, block2]);
    expect(result.isValid).toBe(true);
    expect(result.totalBlocks).toBe(2);
    expect(result.merkleRoot).toBeDefined();
    expect(result.merkleRoot).toHaveLength(64);
  });

  it('deve detectar adulteração de dados em bloco anterior (quebra de integridade)', async () => {
    // Bloco 1
    const block1Input: AuditLogRowInput = {
      id: 'AUD-001',
      document_id: 'DOC-001',
      prev_log_hash: null,
      signed_at: '2026-08-19T10:00:00Z',
      signer_name: 'Mateus Cotrim',
      signer_cpf_masked: '123.***.***-09',
      signer_relationship: 'Pai',
      identity_method: 'matricula_sesi',
      signature_png_sha256: 'sig_hash_1',
      ip_address: '189.120.44.12',
      user_agent: 'Agent 1',
      content_sha256_at_signing: 'content_hash_1',
      consent_text_version: 1,
      manifest_sha256: 'manifest_hash_1',
    };
    const block1Hash = await computeLogRowHash(block1Input);

    const block1: AuditLogRow = {
      ...block1Input,
      prev_log_hash: null,
      signer_cpf_encrypted: 'ENC',
      signature_png_encrypted: 'ENC',
      signer_relationship: 'Pai',
      identity_method: 'matricula_sesi',
      key_version: 1,
      log_row_hash: block1Hash,
      created_at: '2026-08-19T10:00:00Z',
    };

    // Bloco 1 Adulterado no banco (tentativa de fraude no nome do signatário)
    const tamperedBlock1 = {
      ...block1,
      signer_name: 'Fraude Atacante',
    };

    const result = await verifyAuditChain([tamperedBlock1]);
    expect(result.isValid).toBe(false);
    expect(result.corruptedBlockIndex).toBe(0);
    expect(result.error).toContain('Adulteração detectada no Bloco 0');
  });

  it('deve calcular a Raiz de Merkle corretamente para lista de hashes', async () => {
    const hashA = await sha256('hash_a');
    const hashB = await sha256('hash_b');
    const hashC = await sha256('hash_c');

    const merkleRoot = await computeMerkleRoot([hashA, hashB, hashC]);
    expect(merkleRoot).toHaveLength(64);

    const emptyRoot = await computeMerkleRoot([]);
    expect(emptyRoot).toHaveLength(64);
  });
});
