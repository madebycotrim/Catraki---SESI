import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileDown,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { LgpdRequestRecord } from '../../lib/types.ts';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access_export: 'Acesso e Exportação de Dados',
  deletion_anonymization: 'Eliminação / Anonimização',
  rectification: 'Correção de Dados',
  revocation_appeal: 'Revisão / Esclarecimento',
};

const REQUEST_STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pendente', classes: 'bg-amber-100 text-amber-900 border border-amber-200' },
  in_analysis: { label: 'Em Análise', classes: 'bg-blue-100 text-blue-900 border border-blue-200' },
  completed: { label: 'Concluído', classes: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
  rejected: { label: 'Indeferido', classes: 'bg-rose-100 text-rose-900 border border-rose-200' },
};

interface AdminLgpdPanelProps {
  onRequestsUpdated?: () => void;
}

export const AdminLgpdPanel: React.FC<AdminLgpdPanelProps> = ({ onRequestsUpdated }) => {
  const [identifier, setIdentifier] = useState('');
  const [anonymizeReason, setAnonymizeReason] = useState('');
  const [confirmAnonymize, setConfirmAnonymize] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [anonymizeReport, setAnonymizeReport] = useState<any | null>(null);
  const [feedbackError, setFeedbackError] = useState('');

  const [requests, setRequests] = useState<LgpdRequestRecord[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseStatus, setResponseStatus] = useState<'in_analysis' | 'completed' | 'rejected'>('completed');

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const list = await apiClient.fetchLgpdRequests();
      setRequests(Array.isArray(list) ? list : []);
      onRequestsUpdated?.();
    } catch {
      setFeedbackError('Não foi possível carregar as solicitações LGPD do servidor.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleExport = async () => {
    setFeedbackError('');
    setExportResult(null);
    setAnonymizeReport(null);
    if (!identifier.trim()) {
      setFeedbackError('Informe o e-mail ou CPF do titular para exportar.');
      return;
    }

    setExporting(true);
    try {
      const res = await apiClient.exportTitularData(identifier.trim());
      if (res.success && res.dossier) {
        setExportResult(res.dossier);
      } else {
        setFeedbackError(res.error || 'Falha ao exportar dados do titular.');
      }
    } catch {
      setFeedbackError('Erro ao conectar ao servidor para exportação LGPD.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJson = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgpd-dossie-${exportResult.query_type}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnonymize = async () => {
    setFeedbackError('');
    setAnonymizeReport(null);
    if (!identifier.trim()) {
      setFeedbackError('Informe o e-mail ou CPF do titular para anonimizar.');
      return;
    }
    if (anonymizeReason.trim().length < 10) {
      setFeedbackError('Informe o motivo ou número do protocolo LGPD (mínimo 10 caracteres).');
      return;
    }
    if (!confirmAnonymize) {
      setFeedbackError('Marque a confirmação expressa antes de executar a anonimização.');
      return;
    }

    setAnonymizing(true);
    try {
      const res = await apiClient.anonymizeTitularData(identifier.trim(), anonymizeReason.trim());
      if (res.success && res.report) {
        setAnonymizeReport(res.report);
        setConfirmAnonymize(false);
        setAnonymizeReason('');
      } else {
        setFeedbackError(res.error || 'Falha ao anonimizar dados do titular.');
      }
    } catch {
      setFeedbackError('Erro ao conectar ao servidor para anonimização LGPD.');
    } finally {
      setAnonymizing(false);
    }
  };

  const handleRespondRequest = async (id: string) => {
    if (responseNotes.trim().length < 5) {
      setFeedbackError('Informe o parecer do DPO com pelo menos 5 caracteres.');
      return;
    }
    setFeedbackError('');
    const res = await apiClient.respondLgpdRequest(id, responseStatus, responseNotes.trim());
    if (res.success) {
      setRespondingId(null);
      setResponseNotes('');
      await loadRequests();
    } else {
      setFeedbackError(res.error || 'Falha ao atualizar solicitação.');
    }
  };

  const getDaysRemaining = (deadline?: string | null, createdAt?: string) => {
    const target = deadline
      ? new Date(deadline)
      : createdAt
        ? new Date(new Date(createdAt).getTime() + 15 * 24 * 60 * 60 * 1000)
        : null;
    if (!target || Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  };

  return (
    <div className="space-y-6">
      {feedbackError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{feedbackError}</span>
        </div>
      )}

      {/* Ferramenta de Exportação e Anonimização por E-mail ou CPF */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-[#034b7f]" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">
              Rotina de Exportação e Anonimização de Titulares (LGPD Art. 18)
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Busque por CPF ou e-mail para exportar o dossiê completo em JSON ou anonimizar dados pessoais sem quebrar a trilha de auditoria (Hash Chain).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="admin-lgpd-identifier" className="block text-xs font-bold uppercase text-slate-700">
              CPF ou E-mail do Titular
            </label>
            <input
              id="admin-lgpd-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ex: 123.456.789-00 ou responsavel@email.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#034b7f]"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#034b7f] hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>Exportar Tudo (JSON)</span>
            </button>
          </div>

          <div className="space-y-2 bg-amber-50/50 border border-amber-200 rounded-xl p-3.5">
            <label htmlFor="admin-lgpd-reason" className="block text-xs font-bold uppercase text-amber-950">
              Anonimização Segura (Preserva Histórico Obrigatório)
            </label>
            <input
              id="admin-lgpd-reason"
              type="text"
              value={anonymizeReason}
              onChange={(e) => setAnonymizeReason(e.target.value)}
              placeholder="Protocolo LGPD ou justificativa (mín. 10 chars)"
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none"
            />
            <label className="flex items-start gap-2 text-[11px] text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAnonymize}
                onChange={(e) => setConfirmAnonymize(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Confirmo a anonimização irreversível dos dados cadastrais identificáveis, mantendo a Hash Chain em audit_logs.
              </span>
            </label>
            <button
              type="button"
              onClick={handleAnonymize}
              disabled={anonymizing || !confirmAnonymize}
              className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {anonymizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Anonimizar Dados do Titular</span>
            </button>
          </div>
        </div>

        {exportResult && (
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-[#034b7f]">
                Dossiê Exportado ({exportResult.identifier_masked}) — {exportResult.summary?.total_documents || 0} documento(s), {exportResult.summary?.total_audit_logs || 0} log(s), {exportResult.summary?.total_lgpd_requests || 0} solicitação(ões)
              </strong>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-3 py-1.5 bg-[#034b7f] text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Baixar JSON</span>
              </button>
            </div>
            <pre className="max-h-60 overflow-auto bg-white p-3 rounded-lg border border-blue-100 text-[11px] font-mono">
              {JSON.stringify(exportResult, null, 2)}
            </pre>
          </div>
        )}

        {anonymizeReport && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4" />
              <span>Anonimização concluída com preservação da cadeia de auditoria</span>
            </div>
            <p className="m-0">
              Documentos anonimizados: <strong>{anonymizeReport.documents_anonymized}</strong> | Solicitações anonimizadas:{' '}
              <strong>{anonymizeReport.lgpd_requests_anonymized}</strong> | Registros de auditoria preservados (Hash Chain):{' '}
              <strong>{anonymizeReport.audit_logs_preserved_for_legal_compliance}</strong>
            </p>
            <p className="m-0 text-[11px] text-emerald-800">{anonymizeReport.legal_note}</p>
          </div>
        )}
      </div>

      {/* Fila de Solicitações LGPD com Prazo de 15 dias */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#034b7f]" />
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Solicitações de Titulares Recebidas (Prazo Legal: 15 dias)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadRequests}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-slate-500 m-0">Nenhuma solicitação LGPD registrada até o momento.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const daysLeft = getDaysRemaining(req.response_deadline_at, req.created_at);
              const statusMeta = REQUEST_STATUS_META[req.status] || {
                label: req.status,
                classes: 'bg-slate-200 text-slate-800',
              };
              const typeLabel = REQUEST_TYPE_LABELS[req.request_type] || req.request_type;

              return (
                <div key={req.id} className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <strong className="text-slate-900">{req.requester_name}</strong>
                      <span className="font-mono text-slate-500">({req.requester_cpf_masked})</span>
                      {req.requester_email && (
                        <span className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {req.requester_email}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(req.status === 'pending' || req.status === 'in_analysis') && daysLeft !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            daysLeft <= 3 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {daysLeft >= 0 ? `${daysLeft} dia(s) restante(s)` : 'Prazo vencido'}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${statusMeta.classes}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                  <p className="m-0 text-slate-700 leading-relaxed">{req.details}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      Recebida em: <strong>{req.created_at ? new Date(req.created_at).toLocaleString('pt-BR') : '-'}</strong>
                    </span>
                    {req.privacy_policy_version && (
                      <span className="font-mono">
                        Política v{req.privacy_policy_version} ({req.privacy_policy_accepted_at ? new Date(req.privacy_policy_accepted_at).toLocaleString('pt-BR') : '-'})
                      </span>
                    )}
                  </div>
                  {req.response_notes && (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700">
                      <strong className="text-slate-900">Parecer do DPO:</strong> {req.response_notes}
                    </div>
                  )}

                  {respondingId === req.id ? (
                    <div className="pt-2 space-y-2 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={responseStatus}
                          onChange={(e) => setResponseStatus(e.target.value as any)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="in_analysis">Em Análise</option>
                          <option value="completed">Concluído</option>
                          <option value="rejected">Indeferido</option>
                        </select>
                        <input
                          type="text"
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          placeholder="Parecer do DPO..."
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondRequest(req.id)}
                          className="px-3 py-1.5 bg-[#034b7f] text-white rounded-lg font-bold cursor-pointer"
                        >
                          Salvar Parecer
                        </button>
                        <button
                          type="button"
                          onClick={() => setRespondingId(null)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingId(req.id);
                          setResponseNotes(req.response_notes || '');
                        }}
                        className="text-[#034b7f] font-bold underline cursor-pointer"
                      >
                        Responder / Atualizar Parecer
                      </button>
                      {req.requester_email && (
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier(req.requester_email || '');
                            setAnonymizeReason(req.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-emerald-700 font-bold underline cursor-pointer"
                        >
                          Carregar E-mail na Busca (Exportar / Anonimizar)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
