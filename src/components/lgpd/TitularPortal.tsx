import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileDown,
  Trash2,
  Edit3,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Printer,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import { formatCPF, isValidCPF, isValidFullName, formatBrasiliaDateTime, formatBrasiliaDate } from '../../lib/schemas.ts';
import { PRIVACY_POLICY_VERSION, LGPD_RESPONSE_DEADLINE_DAYS } from '../../lib/lgpd.ts';
import { TurnstileWidget } from '../common/TurnstileWidget.tsx';
import type { LgpdRequestType } from '../../lib/types.ts';

interface TitularPortalProps {
  onBack: () => void;
  onNavigateToPrivacy?: () => void;
}

const REQUEST_TYPE_OPTIONS: Array<{
  value: LgpdRequestType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'access',
    label: 'Acesso e Exportação Completa dos Dados',
    description: 'Receba tudo que o sistema possui vinculado ao seu CPF ou e-mail (Art. 18, II e V).',
    icon: <FileDown className="w-4 h-4 text-[#034b7f]" />,
  },
  {
    value: 'deletion',
    label: 'Eliminação / Anonimização de Dados',
    description: 'Solicite o apagamento ou anonimização preservando o histórico legal obrigatório (Art. 18, VI).',
    icon: <Trash2 className="w-4 h-4 text-amber-700" />,
  },
  {
    value: 'rectification',
    label: 'Correção de Dados Incompletos ou Inexatos',
    description: 'Atualize informações cadastrais incorretas do responsável ou estudante (Art. 18, III).',
    icon: <Edit3 className="w-4 h-4 text-emerald-700" />,
  },
  {
    value: 'revocation_appeal',
    label: 'Revisão / Esclarecimento sobre Revogação',
    description: 'Solicite informações ou revisão sobre consentimentos revogados (Art. 18, VIII).',
    icon: <Scale className="w-4 h-4 text-purple-700" />,
  },
];

export const TitularPortal: React.FC<TitularPortalProps> = ({ onBack, onNavigateToPrivacy }) => {
  const [requesterName, setRequesterName] = useState('');
  const [requesterCpf, setRequesterCpf] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requestType, setRequestType] = useState<LgpdRequestType>('access');
  const [details, setDetails] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyAcceptedAt, setPrivacyAcceptedAt] = useState('');
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<{
    protocol: string;
    response_deadline_at?: string;
    privacy_policy_version?: string;
    privacy_policy_accepted_at?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isValidFullName(requesterName.trim())) {
      setErrorMessage('Informe seu nome completo conforme documento oficial.');
      return;
    }
    if (!isValidCPF(requesterCpf)) {
      setErrorMessage('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail.trim())) {
      setErrorMessage('Informe um endereço de e-mail válido.');
      return;
    }
    if (details.trim().length < 15) {
      setErrorMessage('Descreva sua solicitação com pelo menos 15 caracteres.');
      return;
    }
    if (!privacyAccepted) {
      setErrorMessage(`É obrigatório aceitar a Política de Privacidade (Versão ${PRIVACY_POLICY_VERSION}).`);
      return;
    }

    setSubmitting(true);
    try {
      const acceptedAt = privacyAcceptedAt || new Date().toISOString();
      const resp = await apiClient.submitLgpdRequest({
        requester_name: requesterName.trim(),
        requester_cpf: requesterCpf.replace(/\D/g, ''),
        requester_email: requesterEmail.trim().toLowerCase(),
        request_type: requestType,
        details: details.trim(),
        privacy_policy_accepted: true,
        privacy_policy_version: PRIVACY_POLICY_VERSION,
        privacy_policy_accepted_at: acceptedAt,
        turnstile_token: turnstileToken || undefined,
      });

      if (resp.success) {
        setReceipt({
          protocol: resp.protocol || `LGPD-${Date.now()}`,
          response_deadline_at: resp.response_deadline_at,
          privacy_policy_version: resp.privacy_policy_version || PRIVACY_POLICY_VERSION,
          privacy_policy_accepted_at: resp.privacy_policy_accepted_at || acceptedAt,
        });
      } else {
        setErrorMessage(resp.error || 'Não foi possível registrar sua solicitação.');
      }
    } catch {
      setErrorMessage('Erro de conexão ao registrar solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1 text-slate-800">
      <div className="mb-4 px-1 no-print">
        <button
          type="button"
          onClick={onBack}
          className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </button>
      </div>

      <div className="document-sheet-a4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <img src="/catraki.png" alt="Catraki" className="h-8 sm:h-10 w-auto object-contain rounded" />
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              DIREITOS DO TITULAR — LGPD ART. 18 E ART. 19
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Portal de Acesso, Exportação e Eliminação de Dados
            </p>
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#034b7f] border border-blue-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Prazo Legal de Resposta: Até {LGPD_RESPONSE_DEADLINE_DAYS} dias</span>
          </div>
          <h1 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 m-0">
            Solicitação de Direitos do Titular de Dados Pessoais
          </h1>
          <p className="text-xs text-slate-600 m-0">
            Solicite cópia completa dos seus dados (a partir do CPF ou e-mail) ou peça eliminação/anonimização sem quebrar o histórico legal obrigatório.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 sm:p-4 text-xs text-emerald-950 leading-relaxed">
          <strong className="block text-[11px] uppercase tracking-wide text-emerald-900 mb-1">
            Por que pedimos estes dados? (Finalidade — LGPD):
          </strong>
          Solicitamos seu <strong>nome completo, CPF e e-mail</strong> exclusivamente para localizar todos os registros vinculados a você ou ao estudante sob sua responsabilidade, validar sua identidade como titular e responder ao pedido dentro do prazo legal de 15 dias.
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {!receipt ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-700">
                Tipo de Solicitação <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REQUEST_TYPE_OPTIONS.map((opt) => {
                  const selected = requestType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRequestType(opt.value)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selected
                          ? 'border-[#034b7f] bg-blue-50/60 ring-1 ring-[#034b7f]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 mb-0 leading-snug">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-3">
                <label htmlFor="lgpd-name" className="block text-xs font-bold uppercase text-slate-700">
                  Nome Completo do Solicitante <span className="text-red-500">*</span>
                </label>
                <input
                  id="lgpd-name"
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#034b7f]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="lgpd-cpf" className="block text-xs font-bold uppercase text-slate-700">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  id="lgpd-cpf"
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  value={requesterCpf}
                  onChange={(e) => setRequesterCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm font-mono focus:outline-none focus:border-[#034b7f]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="lgpd-email" className="block text-xs font-bold uppercase text-slate-700">
                  E-mail para Resposta e Localização <span className="text-red-500">*</span>
                </label>
                <input
                  id="lgpd-email"
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#034b7f]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="lgpd-details" className="block text-xs font-bold uppercase text-slate-700">
                Detalhes da Solicitação <span className="text-red-500">*</span>
              </label>
              <textarea
                id="lgpd-details"
                rows={4}
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
                placeholder="Informe o nome do estudante (se aplicável) e o que deseja consultar, corrigir ou anonimizar..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#034b7f]"
              />
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className={details.trim().length > 0 && details.trim().length < 15 ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                  {details.trim().length < 15 ? `Mínimo 15 caracteres (faltam ${Math.max(0, 15 - details.trim().length)})` : '✓ Descrição válida'}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    details.length >= 2000
                      ? 'text-red-600'
                      : details.length >= 1800
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}
                >
                  {details.length} / 2000
                </span>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 sm:p-4">
              <label htmlFor="lgpd-privacy-accept" className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="lgpd-privacy-accept"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrivacyAccepted(checked);
                    setPrivacyAcceptedAt(checked ? new Date().toISOString() : '');
                  }}
                  className="mt-0.5 w-5 h-5 min-w-[20px] rounded border-slate-400 text-[#034b7f] cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <strong>Li e aceito a Política de Privacidade</strong> (Versão{' '}
                  <span className="font-mono font-bold text-[#034b7f]">{PRIVACY_POLICY_VERSION}</span> —{' '}
                  <a
                    href="/privacidade"
                    onClick={(e) => {
                      if (onNavigateToPrivacy) {
                        e.preventDefault();
                        onNavigateToPrivacy();
                      }
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#034b7f] font-bold underline"
                  >
                    ler documento
                  </a>
                  ), autorizando o registro de data, hora e versão deste aceite. <span className="text-red-500 font-bold">*</span>
                  {privacyAccepted && privacyAcceptedAt && (
                    <span className="block mt-1 text-[11px] font-mono text-emerald-700 font-semibold">
                      ✓ Aceite registrado em {formatBrasiliaDateTime(privacyAcceptedAt)} (BRT) (Versão {PRIVACY_POLICY_VERSION})
                    </span>
                  )}
                </span>
              </label>
            </div>

            {turnstileSiteKey && (
              <div className="flex justify-center">
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onVerify={(tk) => setTurnstileToken(tk)}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || !privacyAccepted}
                className="w-full sm:w-auto px-6 py-3 bg-[#034b7f] hover:bg-blue-900 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando protocolo...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enviar Solicitação ao DPO</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center pb-3 border-b border-slate-200 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-800 border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Solicitação Registrada</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase m-0">
                COMPROVANTE DE SOLICITAÇÃO LGPD (ART. 18)
              </h2>
              <p className="text-xs text-slate-600 m-0">
                Encaminhada ao Encarregado pelo Tratamento de Dados Pessoais (DPO) • Prazo legal: até <strong>{LGPD_RESPONSE_DEADLINE_DAYS} dias</strong>.
              </p>
            </div>

            <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Protocolo LGPD</span>
                  <strong className="font-mono text-slate-900 select-all">{receipt.protocol}</strong>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Solicitação</span>
                  <strong className="text-slate-900">
                    {REQUEST_TYPE_OPTIONS.find((o) => o.value === requestType)?.label || requestType}
                  </strong>
                </div>
                {receipt.response_deadline_at && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Prazo Limite (Art. 19, II)</span>
                    <strong className="font-mono text-slate-900">{formatBrasiliaDate(receipt.response_deadline_at)}</strong>
                  </div>
                )}
                {receipt.privacy_policy_accepted_at && (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Aceite Política v{receipt.privacy_policy_version}</span>
                    <strong className="font-mono text-slate-900">{formatBrasiliaDateTime(receipt.privacy_policy_accepted_at)} (BRT)</strong>
                  </div>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[10.5px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Controladores e DPO (LGPD Art. 9º e 41):</strong>{' '}
                Universidade de Brasília (UnB — CNPJ 00.038.174/0001-43) e SESI-DF (CNPJ 03.777.341/0001-08). DPO: <strong>suporte@catraki.com.br</strong>.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-[#034b7f] border border-slate-300 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF (A4)</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#034b7f] text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        )}

        {/* Barra institucional azul sólida no final da folha A4 */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-[#034b7f] overflow-hidden pointer-events-none z-10 leading-none" />
      </div>
    </div>
  );
};
