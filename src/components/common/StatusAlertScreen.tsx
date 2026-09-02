import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  XCircle,
  Download,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Clock,
} from 'lucide-react';

export type AlertScenario =
  | 'cancelled_link'      // Cenário 1: Link indisponível ou documento cancelado
  | 'security_tampered'   // Cenário 2: Acesso interrompido por segurança (Hash)
  | 'already_signed'      // Cenário 3: Tudo certo por aqui! (Já assinado)
  | 'otp_auth_failed'     // Cenário 4: Não foi possível confirmar sua identidade
  | 'link_expired';       // Cenário 5: Link de acesso expirado (TTL 3 dias - Segurança LGPD)

interface StatusAlertScreenProps {
  scenario: AlertScenario;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  customReason?: string;
  documentTitle?: string;
  downloadUrl?: string;
}

export const StatusAlertScreen: React.FC<StatusAlertScreenProps> = ({
  scenario,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  customReason,
  documentTitle,
  downloadUrl,
}) => {
  const handleDefaultGoHome = () => {
    window.location.href = '/autorizar/cemeit';
  };

  if (scenario === 'link_expired') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-amber-200 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <Clock className="w-9 h-9 text-amber-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Expiração de Segurança
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Link de Acesso Expirado
            </h2>
            <p className="text-sm sm:text-base font-medium text-amber-900 leading-relaxed bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/60">
              Por motivos de segurança e proteção aos dados do estudante (LGPD), este link de assinatura possui validade de 3 dias e já expirou.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-center px-1">
            Por favor, entre em contato com a escola ou com a equipe do SESI para solicitar um novo link de acesso atualizado.
          </p>

          {customReason && (
            <div className="text-left text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <span className="font-semibold text-slate-700">Detalhe:</span> {customReason}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={onPrimaryAction || handleDefaultGoHome}
              className="w-full sm:w-auto px-6 py-3 bg-[#004b8d] hover:bg-[#003666] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto active:scale-98 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {primaryActionLabel || 'Voltar para a página inicial'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === 'cancelled_link') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-amber-200 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Link indisponível ou documento cancelado
            </h2>
            <p className="text-sm sm:text-base font-medium text-amber-800 leading-relaxed bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/60">
              Este link não está mais disponível. O documento foi cancelado, substituído ou expirou. Por favor, entre em contato com a escola ou com a equipe responsável para solicitar um novo acesso.
            </p>
          </div>

          {customReason && (
            <div className="text-left text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <span className="font-semibold text-slate-700">Motivo informado:</span> {customReason}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={onPrimaryAction || handleDefaultGoHome}
              className="w-full sm:w-auto px-6 py-3 bg-[#004b8d] hover:bg-[#003666] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto active:scale-98 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {primaryActionLabel || 'Voltar para a página inicial'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === 'security_tampered') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-red-200 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200 shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              Segurança Digital
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Acesso interrompido por segurança
            </h2>
            <p className="text-sm sm:text-base font-medium text-red-900 leading-relaxed bg-red-50/80 p-3.5 rounded-xl border border-red-200/60">
              Nosso sistema de segurança detectou uma inconsistência nos dados de autenticidade deste documento e, para garantir a integridade legal de todos os envolvidos, o processo de assinatura foi bloqueado.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify sm:text-center px-1">
            Isso indica que os mecanismos de segurança da plataforma estão funcionando corretamente. Como não foi possível confirmar a integridade original deste documento, o acesso foi bloqueado por precaução. Não é necessária nenhuma ação da sua parte. Por favor, solicite um novo documento à equipe responsável.
          </p>

          <div className="pt-2">
            <button
              onClick={onPrimaryAction || handleDefaultGoHome}
              className="w-full sm:w-auto px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto active:scale-98 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              {primaryActionLabel || 'Fechar e Contatar a Equipe'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scenario === 'already_signed') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-emerald-200 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Assinatura Registrada
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tudo certo por aqui!
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-900 leading-relaxed bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/60">
              Sua assinatura eletrônica foi registrada com sucesso e possui plena validade jurídica.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify sm:text-center px-1">
            Uma cópia completa do comprovante já foi enviada para o seu e-mail. Você pode baixar a sua via agora ou acessar o validador público a qualquer momento usando o código de autenticidade.
          </p>

          {documentTitle && (
            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 font-medium">
              Documento: <span className="text-slate-800 font-bold">{documentTitle}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (onSecondaryAction) onSecondaryAction(); }}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                {secondaryActionLabel || 'Baixar Meu Comprovante'}
              </a>
            )}
            <button
              onClick={onPrimaryAction || handleDefaultGoHome}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <ExternalLink className="w-4 h-4" />
              {primaryActionLabel || 'Fechar tela'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cenário 4: Falha na etapa de confirmação de identidade (OTP/Token)
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5 text-left shadow-xs space-y-3.5 my-2 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
          <KeyRound className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-red-950">
            Não foi possível confirmar sua identidade
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-red-800 leading-snug">
            {customReason || 'O código de segurança inserido está incorreto ou já expirou.'}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-normal bg-white/60 p-2.5 rounded-lg border border-red-100/50">
        A confirmação de identidade é necessária para garantir a segurança jurídica da sua assinatura. Por favor, solicite um novo código — ele chegará ao seu e-mail em instantes. Se necessário, verifique também sua pasta de Spam.
      </p>

      {onPrimaryAction && (
        <div className="flex justify-end pt-0.5">
          <button
            onClick={onPrimaryAction}
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {primaryActionLabel || 'Solicitar Novo Código de Segurança'}
          </button>
        </div>
      )}
    </div>
  );
};
