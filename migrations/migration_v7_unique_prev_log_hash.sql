-- ============================================================================
-- MIGRAÇÃO V7: Unicidade física de prev_log_hash em audit_logs
-- Previne bifurcação da Hash Chain sob concorrência simultânea (Lei 14.063/2020)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_prev_hash_unique
  ON audit_logs(prev_log_hash)
  WHERE prev_log_hash IS NOT NULL;
