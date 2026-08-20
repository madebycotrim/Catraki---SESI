import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, XCircle, Eye, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';

export const ManualReviewQueue: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const resp = await apiClient.getAdminManualReviews();
    if (resp.success) {
      setReviews(resp.reviews);
    }
    setLoading(false);
  };

  const handleAction = async (reviewId: string, action: 'approve' | 'reject') => {
    setProcessingId(reviewId);
    setSuccessMessage('');

    try {
      const resp = await apiClient.actionManualReview(reviewId, action, actionNotes);
      if (resp.success) {
        setSuccessMessage(resp.message);
        setSelectedReview(null);
        setActionNotes('');
        loadReviews();
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Fila de Revisão Manual de Vínculo de Responsável
          </h2>
          <p className="text-xs text-slate-400">
            Casos sem correspondência direta na matrícula SESI ou com representação por tutela/guarda judicial.
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
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Carregando fila de revisão documental...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-800">
          Nenhuma solicitação de revisão manual pendente no momento.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Protocolo / Data</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Menor / Paciente</th>
                  <th className="px-4 py-3">Vínculo Alegado</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <span className="text-blue-300 font-bold block">{rev.id}</span>
                      <span className="text-slate-500">{new Date(rev.created_at).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white block">{rev.signer_name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{rev.signer_cpf_masked}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{rev.minor_name || 'Menor Cadastrado'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                        {rev.signer_relationship}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rev.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Pendente Análise
                        </span>
                      )}
                      {rev.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Aprovado
                        </span>
                      )}
                      {rev.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                          Rejeitado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedReview(rev)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecionar Documentos</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Inspeção de Documentos e Parecer */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-5 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Inspeção Documental de Vínculo Legal</h3>
                <span className="font-mono text-xs text-blue-300">{selectedReview.id}</span>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Dados do Solicitante:</span>
                <span className="font-bold text-white block">{selectedReview.signer_name}</span>
                <span className="font-mono text-slate-300 block">CPF: {selectedReview.signer_cpf_masked}</span>
                <span className="text-blue-300 block">Vínculo Declarado: {selectedReview.signer_relationship}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Paciente / Menor:</span>
                <span className="font-bold text-white block">{selectedReview.minor_name || 'Lucas Cotrim Silva'}</span>
                <span className="text-slate-400 text-[11px] block">{selectedReview.review_notes}</span>
              </div>
            </div>

            {/* Visualizador de Imagens */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Evidências Fotográficas (Metadados EXIF Sanitizados)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <span className="font-semibold text-slate-300 block">Documento de Identidade (RG/CNH)</span>
                  {selectedReview.identity_doc_r2_key && selectedReview.identity_doc_r2_key.startsWith('data:image') ? (
                    <img
                      src={selectedReview.identity_doc_r2_key}
                      alt="Documento do Responsável"
                      className="max-h-40 mx-auto rounded border border-slate-700 object-contain"
                    />
                  ) : (
                    <div className="h-32 bg-slate-950 rounded flex flex-col items-center justify-center text-slate-500 gap-1 border border-slate-800">
                      <FileText className="w-8 h-8 text-blue-400" />
                      <span>Documento Oficial Armazenado no R2</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <span className="font-semibold text-slate-300 block">Selfie com Documento</span>
                  {selectedReview.selfie_doc_r2_key && selectedReview.selfie_doc_r2_key.startsWith('data:image') ? (
                    <img
                      src={selectedReview.selfie_doc_r2_key}
                      alt="Selfie do Responsável"
                      className="max-h-40 mx-auto rounded border border-slate-700 object-contain"
                    />
                  ) : (
                    <div className="h-32 bg-slate-950 rounded flex flex-col items-center justify-center text-slate-500 gap-1 border border-slate-800">
                      <ImageIcon className="w-8 h-8 text-emerald-400" />
                      <span>Selfie de Validação Facial no R2</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parecer do Auditor */}
            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-300">Parecer / Observação do Auditor:</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={2}
                placeholder="Insira as observações da validação documental..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
              />
            </div>

            {/* Botões de Decisão */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleAction(selectedReview.id, 'reject')}
                disabled={processingId === selectedReview.id}
                className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeitar Vínculo</span>
              </button>

              <button
                onClick={() => handleAction(selectedReview.id, 'approve')}
                disabled={processingId === selectedReview.id}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar e Liberar Assinatura</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
