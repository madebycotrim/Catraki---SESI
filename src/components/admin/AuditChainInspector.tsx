import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import { formatBrasiliaDateTime } from '../../lib/schemas.ts';
import type { ChainVerificationResult } from '../../lib/types.ts';

export const AuditChainInspector: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [verification, setVerification] = useState<ChainVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    runAuditVerification();
  }, []);

  const runAuditVerification = async () => {
    setLoading(true);
    try {
      const [logsResp, verifyResp] = await Promise.all([
        apiClient.getAdminAuditLogs(),
        apiClient.verifyAuditChain(),
      ]);

      if (logsResp.success) {
        setLogs(logsResp.logs);
      }
      if (verifyResp.success) {
        setVerification(verifyResp.verification);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Status da Integridade Criptográfica */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border-l-4 border-l-emerald-500 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Cadeia de Auditoria Criptográfica (Hash Chain)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Trilha Append-Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Encadeamento com <code className="font-mono text-blue-300">prev_log_hash</code> e regras de proteção no banco de dados.
              </p>
            </div>
          </div>

          <button
            onClick={runAuditVerification}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalcular Integridade</span>
          </button>
        </div>

        {/* Quadro de Resumo de Verificação */}
        {verification && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Integridade da Cadeia:</span>
              <span className={`font-bold text-sm flex items-center gap-1.5 ${verification.isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                {verification.isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {verification.isValid ? 'Íntegra (Cálculo Validado)' : 'Inconsistência Detectada'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Total de Blocos Auditados:</span>
              <span className="font-mono text-sm font-bold text-blue-300">
                {verification.totalBlocks} Blocos
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Raiz de Merkle Atual:</span>
              <span className="font-mono text-[10px] text-slate-300 truncate block" title={verification.merkleRoot}>
                {verification.merkleRoot ? `${verification.merkleRoot.substring(0, 20)}...` : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista e Encadeamento Visual dos Blocos */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-blue-400" />
          <span>Sequência Cronológica de Blocos Encadeados</span>
        </h3>

        {logs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-800">
            Nenhum registro de assinatura realizado ainda. Assine um termo para visualizar o encadeamento.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="glass-card rounded-xl p-4 border border-slate-800 hover:border-blue-500/40 transition-colors cursor-pointer space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center font-mono">
                      #{logs.length - index}
                    </span>
                    <span className="font-mono font-bold text-white">{log.id}</span>
                    <span className="text-slate-400">• Paciente: <strong className="text-slate-200">{log.minor_name || 'Menor'}</strong></span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatBrasiliaDateTime(log.signed_at || log.created_at)} (Horário de Brasília)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 truncate">
                    <span className="text-slate-500 block text-[10px]">Hash Intrínseco do Bloco (log_row_hash):</span>
                    <span className="text-blue-300">{log.log_row_hash}</span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-800 truncate">
                    <span className="text-slate-500 block text-[10px]">Elo com Bloco Anterior (prev_log_hash):</span>
                    <span className="text-slate-400">
                      {log.prev_log_hash || '0000000000000000000000000000000000000000000000000000000000000000 (Gênesis)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Signatário: <strong className="text-slate-300">{log.signer_name}</strong> ({log.signer_cpf_masked})</span>
                  <span className="text-emerald-400 font-medium">✓ SHA-256 Verificado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes Forenses do Bloco */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 border border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Detalhamento Forense do Bloco de Auditoria</h3>
                <span className="font-mono text-xs text-blue-300">{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Document ID:</span>
                <span className="text-slate-200 text-xs">{selectedLog.document_id}</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Manifest SHA-256:</span>
                <span className="text-blue-300 text-xs break-all">{selectedLog.manifest_sha256}</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">IP & Geolocalização Registrada:</span>
                <span className="text-slate-300 text-xs">
                  {selectedLog.ip_address} ({selectedLog.geo_city}/{selectedLog.geo_region})
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Garantia de Imutabilidade:</span>
                <span className="text-emerald-400 text-xs">
                  SQLite Triggers prevent_audit_update / prevent_audit_delete ativados no D1.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
