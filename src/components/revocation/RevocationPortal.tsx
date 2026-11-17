import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import { formatCPF } from '../../lib/schemas.ts';
import { PRIVACY_POLICY_VERSION } from '../../lib/lgpd.ts';

interface RevocationPortalProps {
  token: string;
  onBack: () => void;
}

export const RevocationPortal: React.FC<RevocationPortalProps> = ({ token, onBack }) => {
  const [docToken, setDocToken] = useState(token || '');
  const [signerCpf, setSignerCpf] = useState('');
  const [reason, setReason] = useState('');
  const [confirmedConsequences, setConfirmedConsequences] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyAcceptedAt, setPrivacyAcceptedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [revokedSuccess, setRevokedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRevoke = async () => {
    const cleanToken = docToken.trim();
    if (!cleanToken || cleanToken.length < 16) {
      setErrorMessage('Informe o protocolo do documento (DOC-...) ou token de acesso válido.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 10) {
      setErrorMessage('Por favor, descreva o motivo da revogação (mínimo de 10 caracteres).');
      return;
    }

    if (!confirmedConsequences) {
      setErrorMessage('Para confirmar a revogação, é necessário marcar que você está ciente das consequências desta ação.');
      return;
    }

    if (!privacyAccepted) {
      setErrorMessage(`É obrigatório aceitar a Política de Privacidade (Versão ${PRIVACY_POLICY_VERSION}) para prosseguir.`);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const resp = await apiClient.revokeConsent(cleanToken, reason.trim(), signerCpf || undefined, {
        privacy_policy_accepted: true,
        privacy_policy_version: PRIVACY_POLICY_VERSION,
        privacy_policy_accepted_at: privacyAcceptedAt || new Date().toISOString(),
      });
      if (resp.success) {
        setRevokedSuccess(true);
      } else {
        setErrorMessage(resp.error || 'Não foi possível registrar a revogação. Por favor, tente novamente.');
      }
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
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
              Termo de Revogação de Autorização de Participação
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base md:text-[13pt] font-bold uppercase text-slate-900 m-0">
            TERMO DE REVOGAÇÃO DE AUTORIZAÇÃO DE PARTICIPAÇÃO
          </h1>
          <h2 className="text-xs sm:text-sm md:text-[10.5pt] font-bold text-slate-600 mt-1 m-0">
            Direito do Titular — Art. 18, VIII da Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
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
                1. FUNDAMENTAÇÃO LEGAL E EFEITOS DA REVOGAÇÃO
              </h3>
              <p className="text-slate-800 m-0 leading-relaxed text-xs sm:text-sm text-left sm:text-justify">
                Você tem o direito de revogar esta autorização a qualquer momento, sem precisar de justificativa formal — isso é garantido pelo <strong>Art. 8º, § 5º e Art. 18, VIII da LGPD (Lei nº 13.709/2018)</strong>. Ao revogar, a participação do(a) estudante em novos atendimentos do projeto será suspensa imediatamente. Os registros anteriores permanecem válidos e guardados conforme exigido por lei.
              </p>
            </div>

            {/* 2. FORMULÁRIO DE MANIFESTAÇÃO DE REVOGAÇÃO */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                2. MOTIVO E DECLARAÇÃO DE REVOGAÇÃO
              </h3>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 leading-relaxed">
                <strong className="block text-[11px] uppercase tracking-wide text-emerald-900 mb-0.5">
                  Por que pedimos estes dados? (Finalidade — LGPD):
                </strong>
                O protocolo do documento e o CPF do responsável signatário são solicitados exclusivamente para confirmar que quem solicita a revogação é o titular legítimo da autorização, impedindo cancelamentos indevidos por terceiros.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="field-revocation-token" className="block text-xs font-bold uppercase text-slate-700">
                    Protocolo ou Token do Documento <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="field-revocation-token"
                    type="text"
                    value={docToken}
                    onChange={(e) => setDocToken(e.target.value)}
                    placeholder="Ex: DOC-20260904-120000-ABCD"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="field-revocation-cpf" className="block text-xs font-bold uppercase text-slate-700">
                    CPF do Responsável Signatário
                  </label>
                  <input
                    id="field-revocation-cpf"
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    value={signerCpf}
                    onChange={(e) => setSignerCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-revocation-reason" className="block text-xs font-bold uppercase text-slate-700">
                  Motivo da Revogação <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="field-revocation-reason"
                  name="revocationReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Descreva o motivo pelo qual deseja revogar esta autorização..."
                  className="w-full px-3.5 sm:px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                />
                <span className="text-[11px] sm:text-xs text-slate-500 block">Descreva em ao menos 10 caracteres.</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-3">
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
                     Estou ciente de que, ao confirmar a revogação, a participação do(a) estudante em novos atendimentos do projeto será suspensa. A coordenação da escola e a equipe de saúde do SESI-DF serão notificadas para atualização dos registros.
                   </span>
                </label>

                <label htmlFor="field-revoke-privacy" className="flex items-start gap-3 cursor-pointer select-none pt-3 border-t border-slate-200">
                  <input
                    id="field-revoke-privacy"
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPrivacyAccepted(checked);
                      setPrivacyAcceptedAt(checked ? new Date().toISOString() : '');
                    }}
                    className="mt-0.5 w-5 h-5 min-w-[20px] rounded border-slate-400 text-sesi-primary focus:ring-sesi-primary cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    Li e aceito a{' '}
                    <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#034b7f] font-bold underline">
                      Política de Privacidade (Versão {PRIVACY_POLICY_VERSION})
                    </a>{' '}
                    com registro de data, hora e versão deste aceite. <span className="text-red-500 font-bold">*</span>
                    {privacyAccepted && privacyAcceptedAt && (
                      <span className="block mt-1 text-[11px] font-mono text-emerald-700 font-semibold">
                        ✓ Aceite registrado em {new Date(privacyAcceptedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Versão {PRIVACY_POLICY_VERSION})
                      </span>
                    )}
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                   Manter Autorização
                </button>

                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading || !confirmedConsequences || !privacyAccepted}
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando revogação...</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4" />
                      <span>Revogar Autorização de Participação</span>
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
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase">Autorização Revogada com Sucesso</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Sua revogação foi registrada com sucesso no sistema. A autorização anterior não é mais válida e a participação do(a) estudante em novos atendimentos foi suspensa. A coordenação da escola e as equipes de saúde já foram notificadas.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Voltar à Página Inicial
              </button>
            </div>
          </div>
        )}

        {/* Barra institucional azul sólida no final da folha (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>

      </div>
    </div>
  );
};

