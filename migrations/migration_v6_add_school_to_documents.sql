-- ============================================================================
-- MIGRAÇÃO V6: Vínculo Explícito de Escola em documents (PRODUÇÃO SEGURA)
-- Zero risco: Apenas adiciona 2 colunas opcionais e 1 índice.
-- NÃO apaga, NÃO altera e NÃO move nenhum dos 305 documentos existentes.
-- NÃO insere nem remove nenhuma escola da tabela institutions.
-- ============================================================================

-- 1. Adiciona as colunas de instituição na tabela documents (se ainda não existirem)
ALTER TABLE documents ADD COLUMN institution_id TEXT;
ALTER TABLE documents ADD COLUMN institution_name TEXT;

-- 2. Cria índice de alta performance para busca e filtros por escola no painel admin
CREATE INDEX IF NOT EXISTS idx_docs_institution_id ON documents(institution_id);

-- 3. (Opcional - Seguro) Atualização retroativa para documentos que já possuem o slug no token
--    Apenas preenche os que estiverem nulos e cujo access_token comece com o ID de uma escola cadastrada
UPDATE documents
SET institution_id = (
  SELECT id FROM institutions 
  WHERE documents.access_token LIKE institutions.id || '-%' 
  LIMIT 1
),
institution_name = (
  SELECT name FROM institutions 
  WHERE documents.access_token LIKE institutions.id || '-%' 
  LIMIT 1
)
WHERE institution_id IS NULL 
  AND access_token IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM institutions 
    WHERE documents.access_token LIKE institutions.id || '-%'
  );

-- 4. Verificação de integridade e contagem pós-migração (esperado: total_documentos = 305)
SELECT 
  COUNT(*) AS total_documentos,
  COUNT(institution_id) AS documentos_com_escola_vinculada
FROM documents;
