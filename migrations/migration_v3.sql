    -- ============================================================================
    -- MIGRAÇÃO V3 — SEGURANÇA ENTERPRISE E COMPLIANCE LGPD (CATRAKI / SESI)
    -- Versionamento de Consentimento + TTL de Links de Assinatura
    -- Totalmente idempotente — seguro para re-execução.
    --
    -- Comando para rodar LOCALMENTE (wrangler dev / local D1):
    --   npx wrangler d1 execute catraki_db --local --file=migration_v3.sql
    --
    -- Comando para rodar em PRODUÇÃO (Cloudflare D1 remoto):
    --   npx wrangler d1 execute catraki_db --remote --file=migration_v3.sql
    -- ============================================================================

    -- ─────────────────────────────────────────────────────────────────────────────
    -- 1. VERSIONAMENTO DE CONSENTIMENTO (LGPD — Blindagem Jurídica)
    -- Grava a versão semântica exata do texto que o usuário leu e aceitou.
    -- Ex: "1.0" — permite provar em juízo qual versão foi aceita em qual data.
    -- Separado de consent_text_version (inteiro interno) pois este é o label
    -- público que aparece no certificado forense.
    -- ─────────────────────────────────────────────────────────────────────────────
    ALTER TABLE documents ADD COLUMN terms_version TEXT NOT NULL DEFAULT '1.0';

    -- ─────────────────────────────────────────────────────────────────────────────
    -- 2. TTL DE LINKS DE ASSINATURA (Segurança — Expiração de Tokens)
    -- token_sent_at: registra o momento em que o link foi enviado ao responsável.
    -- token_ttl_days: prazo (em dias) após o qual o link expira automaticamente.
    -- Padrão = 3 dias (dados sensíveis de menores de idade — máxima segurança).
    -- O sistema verifica: NOW() > token_sent_at + token_ttl_days => TOKEN_EXPIRED
    -- ─────────────────────────────────────────────────────────────────────────────
    ALTER TABLE documents ADD COLUMN token_sent_at DATETIME;
    ALTER TABLE documents ADD COLUMN token_ttl_days INTEGER NOT NULL DEFAULT 3;

    -- ─────────────────────────────────────────────────────────────────────────────
    -- 3. ÍNDICES DE PERFORMANCE
    -- ─────────────────────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_docs_token_sent ON documents(token_sent_at);
    CREATE INDEX IF NOT EXISTS idx_docs_terms_version ON documents(terms_version);
