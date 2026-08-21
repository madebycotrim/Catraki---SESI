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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 sm:px-4 pb-12 pt-2">
      {/* Botão de Voltar */}
      <div className="mb-4 px-1 no-print">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Documento</span>
        </button>
      </div>

      {/* Folha A4 — Padrão ABNT (210mm x 297mm | Margens: Sup/Esq 30mm, Inf/Dir 20mm) */}
      <div
        className="p-6 sm:p-0"
        style={{
          background: '#ffffff',
          paddingTop: '80px',
          paddingLeft: '80px',
          paddingRight: '60px',
          paddingBottom: '80px',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          color: '#000',
          minHeight: '297mm',
          position: 'relative',
          borderRadius: '0px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
          {/* Cabeçalho oficial ABNT */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '3px solid #034b7f',
          }}>
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              style={{ height: '46px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8.5pt', color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Sistema de Gestão Documental
              </p>
              <p style={{ fontSize: '9pt', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
                Termo de Revogação de Consentimento
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título Principal */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#000', margin: '0 0 6px 0' }}>
              TERMO DE REVOGAÇÃO DE CONSENTIMENTO MÉDICO
            </h1>
            <h2 style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#475569', margin: 0 }}>
              Direito do Titular (Art. 18, IX da Lei Geral de Proteção de Dados - Lei 13.709/2018)
            </h2>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm flex items-center gap-2.5 mb-6">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {!revokedSuccess ? (
            <div className="space-y-6 text-slate-800">
              
              {/* 1. FUNDAMENTAÇÃO LEGAL E EFEITOS */}
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                  1. FUNDAMENTAÇÃO LEGAL E EFEITOS JURÍDICOS
                </h3>
                <p style={{ textAlign: 'justify', textIndent: '1.25cm', margin: 0, lineHeight: '1.7', fontSize: '11pt' }}>
                  Nos termos do Art. 8º, § 5º e Art. 18, IX da Lei nº 13.709/2018 (LGPD), o consentimento pode ser revogado a qualquer momento mediante manifestação expressa do titular ou de seu representante legal. A revogação opera efeitos para o futuro (<em>ex nunc</em>), cessando de imediato novos atendimentos clínicos e tratamentos de dados que dependam exclusivamente deste consentimento, mantendo-se preservados os atos e prontuários médicos anteriormente realizados por dever legal e regulatório (Código de Ética Médica e CFM).
                </p>
              </div>

              {/* 2. FORMULÁRIO DE MANIFESTAÇÃO DE REVOGAÇÃO */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                  2. JUSTIFICATIVA E DECLARAÇÃO EXPRESSA
                </h3>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Motivo / Justificativa da Revogação <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Descreva fundamentadamente o motivo pelo qual está solicitando a revogação da autorização anteriormente concedida..."
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500">Mínimo de 10 caracteres explicativos.</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmedConsequences}
                      onChange={(e) => setConfirmedConsequences(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-400 text-sesi-primary focus:ring-sesi-primary"
                    />
                    <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      Declaro formalmente ter ciência inequívoca de que a revogação deste consentimento cancelará a participação do(a) estudante em atendimentos clínicos futuros do Projeto Escola Cidadã: Saúde em Movimento, e que a coordenação escolar e a equipe de saúde do SESI serão notificadas de imediato.
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleRevoke}
                    disabled={loading || !confirmedConsequences || reason.trim().length < 10}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registrando Revogação...
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-4 h-4" />
                        Confirmar Revogação de Consentimento
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 uppercase">Consentimento Revogado com Sucesso</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  A revogação foi registrada de forma definitiva na trilha de auditoria criptográfica. O documento passou para o status <strong>REVOGADO</strong> perante o validador público e as equipes de saúde.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={onBack}
                  className="px-6 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Voltar à Página Principal
                </button>
              </div>
            </div>
          )}

          {/* ─── Barra institucional no final da folha A4 ─── */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', height: '36px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>

          {/* ─── Número de página (canto superior direito ABNT) ─── */}
          <div style={{
            position: 'absolute',
            top:   '36px',
            right: '60px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9.5pt',
            color: '#64748b',
          }}>
            1
          </div>

        </div>
    </div>
  );
};
