-- migration_v4.sql
-- Adiciona colunas de autorização específicas (auth_image, auth_health, auth_data) na tabela documents
-- Executar: npx wrangler d1 execute catraki_db --local --file=migration_v4.sql

ALTER TABLE documents ADD COLUMN auth_image TEXT;
ALTER TABLE documents ADD COLUMN auth_health TEXT;
ALTER TABLE documents ADD COLUMN auth_data TEXT;
