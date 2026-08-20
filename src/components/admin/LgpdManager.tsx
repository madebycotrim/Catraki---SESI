import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';

export const LgpdManager: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [status, setStatus] = useState<'completed' | 'rejected' | 'in_analysis'>('completed');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const resp = await apiClient.getAdminLgpdRequests();
    if (resp.success) {
      setRequests(resp.requests);
    }
    setLoading(false);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !responseNotes.trim()) return;

    setSaving(true);
    try {
      selectedReq.status = status;
      selectedReq.response_notes = responseNotes;
      setSuccessMessage('Parecer do DPO registrado com sucesso.');
      setSelectedReq(null);
      setResponseNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" />
            Gestão de Solicitações dos Titulares (LGPD Art. 18)
          </h2>
          <p className="text-xs text-slate-400">
            Painel exclusivo do Encarregado de Dados (DPO) para atendimento a direitos de acesso, retificação e eliminação.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          <span>Carregando solicitações LGPD...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-800">
          Nenhuma solicitação de titular registrada no momento.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Protocolo</th>
                  <th className="px-4 py-3">Requerente</th>
                  <th className="px-4 py-3">Tipo de Direito</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-purple-300 font-bold">
                      {req.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white block">{req.requester_name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{req.requester_cpf_masked}</span>
                    </td>
                    <td className="px-4 py-3 uppercase tracking-wider text-[11px]">
                      {req.request_type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        req.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setResponseNotes(req.response_notes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium cursor-pointer"
                      >
                        Avaliar Parecer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Parecer do DPO */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-xl w-full space-y-4 border border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Parecer do Encarregado (DPO)</h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-300"><strong>Requerente:</strong> {selectedReq.requester_name} ({selectedReq.requester_cpf_masked})</div>
              <div className="text-slate-300"><strong>Tipo:</strong> {selectedReq.request_type}</div>
              <div className="text-slate-400 pt-1"><strong>Detalhamento:</strong> {selectedReq.details}</div>
            </div>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status do Parecer:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                >
                  <option value="completed">Concluído / Atendido</option>
                  <option value="in_analysis">Em Análise Técnica / Jurídica</option>
                  <option value="rejected">Indeferido com Justificativa Legal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Parecer Oficial do DPO:</label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={4}
                  placeholder="Descreva a fundamentação legal e as providências adotadas..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gravar Parecer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
