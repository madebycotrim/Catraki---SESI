-- ============================================================================
-- MIGRATION V5 — Limpeza de CPFs Legados em Texto Plano (LGPD Art. 46)
-- Aplicar após confirmar que todos os registros relevantes possuem
-- minor_cpf_encrypted e minor_cpf_bindex_sha256 preenchidos.
-- ============================================================================

-- 1. Nullificar o campo legado 'minor_cpf' em registros que já possuem
--    a versão criptografada (Privacy by Design — minimização de dados)
UPDATE documents 
SET minor_cpf = NULL
WHERE minor_cpf IS NOT NULL 
  AND minor_cpf_encrypted IS NOT NULL 
  AND minor_cpf_bindex_sha256 IS NOT NULL;

-- 2. Verificação pós-migration: listar registros que AINDA possuem CPF legado
--    (não devem existir se a criptografia foi aplicada corretamente)
SELECT id, status, created_at, 
       CASE WHEN minor_cpf IS NOT NULL THEN 'CPF_LEGADO_PRESENTE' ELSE 'LIMPO' END as cpf_status
FROM documents 
WHERE minor_cpf IS NOT NULL 
ORDER BY created_at ASC;
