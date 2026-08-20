import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, Loader2, ArrowLeft, Info } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';

interface RevocationPortalProps {
  token: string;
  onBack: () => void;
}

export const RevocationPortal: React.FC<RevocationPortalProps> = ({ token, onBack }) => {
  const [reason, setReason] = useState('');
  const [confirmedConsequences, setConfirmedConsequences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revokedSuccess, setRevokedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRevoke = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      setErrorMessage('Por favor, informe a justificativa detalhada da revogação (mínimo 10 caracteres).');
      return;
    }

    if (!confirmedConsequences) {
      setErrorMessage('É obrigatório declarar ciência sobre os efeitos jurídicos e médicos da revogação.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const resp = await apiClient.revokeConsent(token, reason);
      if (resp.success) {
        setRevokedSuccess(true);
      } else {
        setErrorMessage(resp.error || 'Erro ao processar a revogação do consentimento.');
      }
    } catch {
      setErrorMessage('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={onBack}
        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao documento</span>
      </button>

      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border-l-4 border-l-amber-500 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Revogação de Consentimento Médico</h1>
            <p className="text-xs text-slate-400">
              Direito do Titular e Responsável Legal previsto no Art. 18, IX da LGPD (Lei 13.709/2018).
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-200 text-xs">
            {errorMessage}
          </div>
        )}

        {!revokedSuccess ? (
          <div className="space-y-4">
            {/* Aviso Regulatório Importante */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Info className="w-4 h-4" />
                <span>Efeitos Jurídicos e Clínicos da Revogação:</span>
              </div>
              <p className="text-slate-300">
                A revogação do consentimento impede a realização de tratamentos de dados ou procedimentos médicos <strong>futuros</strong>. Por exigência legal e regulatória (ética médica e não-repúdio), o histórico da assinatura anterior é preservado para fins comprobatórios, e a revogação <strong>não desfaz atos médicos já executados</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo / Justificativa da Revogação (Obrigatório):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo pelo qual está revogando a autorização médica anteriormente concedida..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 transition-colors"
              />
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
              <input
                type="checkbox"
                checked={confirmedConsequences}
                onChange={(e) => setConfirmedConsequences(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-600 focus:ring-amber-500 bg-slate-800"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                Declaro ciência inequívoca de que a revogação se aplica a procedimentos futuros e que a equipe de saúde do SESI será imediatamente comunicada do cancelamento desta autorização.
              </span>
            </label>

            <div className="pt-2">
              <button
                onClick={handleRevoke}
                disabled={loading || !confirmedConsequences || reason.trim().length < 10}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
                <span>Confirmar Revogação Definitiva de Consentimento</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Consentimento Revogado com Sucesso</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              A revogação foi registrada com carimbo de data/hora indelével. O status do documento no validador público e no sistema clínico passou para <strong>REVOGADO</strong>.
            </p>
            <div className="pt-3">
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Retornar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
