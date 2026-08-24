import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
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
      setErrorMessage('Por favor, informe a justificativa detalhada da revogação (mínimo de 10 caracteres).');
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

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {/* Botão de Voltar */}
      <div className="mb-4 px-1 no-print">
        <button
          onClick={onBack}
          className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Documento</span>
        </button>
      </div>

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial ABNT */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Sistema de Gestão Documental
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Termo de Revogação de Consentimento
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base md:text-[13pt] font-bold uppercase text-slate-900 m-0">
            TERMO DE REVOGAÇÃO DE CONSENTIMENTO MÉDICO
          </h1>
          <h2 className="text-xs sm:text-sm md:text-[10.5pt] font-bold text-slate-600 mt-1 m-0">
            Direito do Titular (Art. 18, IX da Lei Geral de Proteção de Dados - Lei 13.709/2018)
          </h2>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {!revokedSuccess ? (
          <div className="space-y-6 text-slate-800">
            
            {/* 1. FUNDAMENTAÇÃO LEGAL E EFEITOS */}
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                1. FUNDAMENTAÇÃO LEGAL E EFEITOS JURÍDICOS
              </h3>
              <p className="text-slate-800 m-0 leading-relaxed text-xs sm:text-sm text-left sm:text-justify">
                Nos termos do Art. 8º, § 5º e Art. 18, IX da Lei nº 13.709/2018 (LGPD), o consentimento pode ser revogado a qualquer momento mediante manifestação expressa do titular ou de seu representante legal. A revogação cancela a autorização para novos atendimentos. Fica assegurada a validade jurídica dos atos de consentimento dados anteriormente e a guarda deste registro na plataforma conforme exigido por lei.
              </p>
            </div>

            {/* 2. FORMULÁRIO DE MANIFESTAÇÃO DE REVOGAÇÃO */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                2. JUSTIFICATIVA E DECLARAÇÃO EXPRESSA
              </h3>

              <div className="space-y-2">
                <label htmlFor="field-revocation-reason" className="block text-xs font-bold uppercase text-slate-700">
                  Motivo / Justificativa da Revogação <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="field-revocation-reason"
                  name="revocationReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Descreva resumidamente o motivo pelo qual está solicitando a revogação da autorização anteriormente concedida..."
                  className="w-full px-3.5 sm:px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                />
                <span className="text-[11px] sm:text-xs text-slate-500 block">Mínimo de 10 caracteres explicativos.</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-5">
                <label htmlFor="field-confirm-consequences" className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="field-confirm-consequences"
                    name="confirmConsequences"
                    type="checkbox"
                    checked={confirmedConsequences}
                    onChange={(e) => setConfirmedConsequences(e.target.checked)}
                    className="mt-0.5 w-5 h-5 min-w-[20px] rounded border-slate-400 text-sesi-primary focus:ring-sesi-primary cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    Declaro estar ciente de que a revogação deste consentimento suspenderá a participação do(a) estudante em novos atendimentos clínicos do projeto Escola Cidadã — Saúde em Movimento, e que a coordenação da escola e a equipe de saúde do SESI serão informadas imediatamente para atualização dos registros.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading || !confirmedConsequences || reason.trim().length < 10}
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando Revogação...</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4" />
                      <span>Confirmar Revogação de Consentimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center py-6 sm:py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase">Consentimento Revogado com Sucesso</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                A revogação foi registrada de forma definitiva na trilha de auditoria criptográfica. O documento passou para o status <strong>REVOGADO</strong> perante o validador público e as equipes de saúde.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Voltar à Página Principal
              </button>
            </div>
          </div>
        )}

        {/* Barra institucional no final da folha A4 */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>

      </div>
    </div>
  );
};

