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
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import { formatCPF, isValidCPF, isValidFullName } from '../../lib/schemas.ts';
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
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Informe o nome do estudante (se aplicável) e o que deseja consultar, corrigir ou anonimizar..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#034b7f]"
              />
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
                      ✓ Aceite registrado em {new Date(privacyAcceptedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Versão {PRIVACY_POLICY_VERSION})
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
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 m-0">Solicitação Registrada com Sucesso</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Seu pedido foi encaminhado ao Encarregado de Dados (DPO). O prazo legal de resposta é de até <strong>{LGPD_RESPONSE_DEADLINE_DAYS} dias</strong>.
            </p>
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-1.5 font-mono">
              <div><strong>Protocolo:</strong> {receipt.protocol}</div>
              {receipt.response_deadline_at && (
                <div><strong>Prazo Limite:</strong> {new Date(receipt.response_deadline_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
              )}
              <div><strong>Política Aceita:</strong> Versão {receipt.privacy_policy_version}</div>
              {receipt.privacy_policy_accepted_at && (
                <div><strong>Data/Hora do Aceite:</strong> {new Date(receipt.privacy_policy_accepted_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 bg-[#034b7f] text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        )}

        {/* Barra institucional azul sólida no final da folha A4 */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-[#034b7f] overflow-hidden pointer-events-none z-10 leading-none" />
      </div>
    </div>
  );
};
