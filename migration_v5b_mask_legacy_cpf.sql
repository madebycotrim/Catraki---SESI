-- ============================================================================
-- MIGRATION V5b — Mascaramento de CPFs Legados Sem Versão Criptografada
-- Para registros anteriores à implementação de AES-GCM (LGPD Art. 46)
-- Converte CPFs completos (123.456.789-01) em formato mascarado (123.***.***-01)
-- ============================================================================

-- 1. Mascarar CPFs legados que NÃO possuem versão criptografada
--    Mantém apenas os 3 primeiros e 2 últimos dígitos (minimização de dados)
UPDATE documents 
SET minor_cpf = SUBSTR(REPLACE(REPLACE(minor_cpf, '.', ''), '-', ''), 1, 3) || '.***.***-' || SUBSTR(REPLACE(REPLACE(minor_cpf, '.', ''), '-', ''), 10, 2)
WHERE minor_cpf IS NOT NULL 
  AND LENGTH(REPLACE(REPLACE(minor_cpf, '.', ''), '-', '')) = 11
  AND minor_cpf NOT LIKE '___.***.***-__'
  AND (minor_cpf_encrypted IS NULL OR minor_cpf_bindex_sha256 IS NULL);

-- 2. Verificação pós-mascaramento
SELECT id, minor_cpf, status, created_at
FROM documents 
WHERE minor_cpf IS NOT NULL
ORDER BY created_at ASC;
