import React from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { SignaturePad } from '../common/SignaturePad.tsx';

export interface OtpSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  minorName: string;
  signerEmail?: string;
  isMaiorDeIdade: boolean;
  dataHoje: string;
  otpCode: string;
  setOtpCode: (val: string) => void;
  simulatedOtp?: string;
  resendCooldown: number;
  otpSending: boolean;
  onResendOtp: () => void;
  onSaveSignature: (base64: string) => void;
  onClearSignature: () => void;
  hasSignature: boolean;
  declarationLegalResponsibility: boolean;
  setDeclarationLegalResponsibility: (val: boolean) => void;
  otpError: string;
  submittingSign: boolean;
  onConfirmSign: () => void;
}

/**
 * Modal em padrão A5 (148mm x 210mm) para verificação de OTP e assinatura manual.
 * Princípio SOLID: Responsabilidade Única (SRP) para renderização e validação interativa
 * da folha de confirmação de identidade e resguardo jurídico (Art. 299 CP).
 */
export const OtpSignatureModal: React.FC<OtpSignatureModalProps> = ({
  isOpen,
  onClose,
  minorName,
  signerEmail,
  isMaiorDeIdade,
  dataHoje,
  otpCode,
  setOtpCode,
  simulatedOtp,
  resendCooldown,
  otpSending,
  onResendOtp,
  onSaveSignature,
  onClearSignature,
  hasSignature,
  declarationLegalResponsibility,
  setDeclarationLegalResponsibility,
  otpError,
  submittingSign,
  onConfirmSign,
}) => {
  if (!isOpen) return null;

  const modalNode = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 m-0 overflow-y-auto animate-in fade-in duration-200">
      {/* Folha A5 — Padrão Formal */}
      <div
        className="w-[calc(100%-2rem)] sm:w-full max-w-[500px] mx-4 my-auto animate-in zoom-in-95 duration-200"
        style={{
          background: '#ffffff',
          paddingTop: '36px',
          paddingLeft: '36px',
          paddingRight: '36px',
          paddingBottom: '48px',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '10pt',
          lineHeight: '1.5',
          color: '#000',
          position: 'relative',
          boxShadow: '0 12px 48px rgba(0,0,0,0.35), 0 2px 10px rgba(0,0,0,0.15)',
          borderRadius: '0px',
        }}
      >
        {/* Botão de Fechar discreto */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho oficial A5 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '12px',
            borderBottom: '2.5px solid #034b7f',
          }}
        >
          <img
            src="/catraki.png"
            alt="Catraki"
            style={{ height: '34px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: '7.5pt',
                color: '#555',
                margin: '0 0 1px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Escola Cidadã — Saúde em Movimento
            </p>
            <p style={{ fontSize: '8pt', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
              Validação de Identidade
            </p>
            <p style={{ fontSize: '7pt', color: '#888', margin: 0 }}>{dataHoje}</p>
          </div>
        </div>

        {/* Título da Folha A5 */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1
            style={{
              fontSize: '11pt',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              color: '#000',
              margin: '0 0 4px 0',
              letterSpacing: '0.02em',
            }}
          >
            CONFIRMAÇÃO DE SEGURANÇA DA ASSINATURA
          </h1>
          <h2 style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#475569', margin: 0 }}>
            Validação rápida por código enviado ao seu e-mail
          </h2>
        </div>

        {/* Corpo do Documento A5 */}
        <div className="space-y-4">
          <p className="text-[11.5px] sm:text-xs text-slate-500 m-0 leading-relaxed text-center">
            Para confirmar a assinatura de <strong>{minorName}</strong>, enviamos um código de 6
            dígitos para o e-mail:
            <br />
            <strong className="text-slate-700">{signerEmail}</strong>
          </p>

          {/* 1. Código OTP de Segurança */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#004b8d]">
              1. Digite o Código de 6 Dígitos
            </label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full text-center tracking-[0.5em] text-xl font-mono font-black py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-sesi-primary focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
            />
            <span className="block text-[9px] text-slate-400 leading-tight">
              * Digitação limitada a 3 tentativas e reenvios limitados a 8.
            </span>
            {simulatedOtp && (
              <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-left">
                <p className="text-[11px] font-bold text-blue-900 m-0">
                  🔑 Modo Desenvolvimento / Teste
                </p>
                <p className="text-[10px] text-blue-700 m-0 mt-0.5 leading-normal">
                  O envio de e-mail real falhou ou foi ignorado. Utilize o código simulado gerado para
                  assinar:{' '}
                  <strong className="text-blue-900 font-mono font-black select-all bg-white px-1.5 py-0.5 border border-blue-150 rounded ml-1">
                    {simulatedOtp}
                  </strong>
                </p>
              </div>
            )}
          </div>

          {/* Reenvio de Código */}
          <div className="text-center">
            {resendCooldown > 0 ? (
              <span className="text-[10px] text-slate-400 font-medium">
                Novo código disponível em {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={onResendOtp}
                disabled={otpSending}
                className="text-[10px] text-sesi-primary hover:text-blue-900 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${otpSending ? 'animate-spin' : ''}`} />
                {otpSending ? 'Enviando...' : 'Reenviar código de segurança'}
              </button>
            )}
          </div>

          {/* 2. Assinatura Manual por Desenho */}
          <div className="pt-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#004b8d] mb-1.5">
              2. Faça sua Assinatura Manual
            </label>
            <SignaturePad onSave={onSaveSignature} onClear={onClearSignature} />
          </div>

          {/* 3. Declaração de Responsabilidade e Veracidade (Art. 299 CP) */}
          <div className="pt-1.5">
            <label
              htmlFor="field-declarationLegalResponsibility"
              className="flex items-start gap-2.5 p-3 border border-slate-200 hover:border-blue-200 rounded-xl bg-slate-50/50 hover:bg-blue-50/10 cursor-pointer select-none transition-all group"
            >
              <div className="relative shrink-0 pt-0.5">
                <input
                  id="field-declarationLegalResponsibility"
                  name="declarationLegalResponsibility"
                  type="checkbox"
                  checked={declarationLegalResponsibility}
                  onChange={(e) => setDeclarationLegalResponsibility(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`flex h-4 w-4 border-2 rounded items-center justify-center transition-colors ${
                    declarationLegalResponsibility
                      ? 'border-[#004b8d]'
                      : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
                  }`}
                >
                  {declarationLegalResponsibility && (
                    <svg
                      className="absolute w-6 h-6 text-[#004b8d] pointer-events-none z-10 drop-shadow-sm"
                      style={{ top: '-6px', left: '-2px', transform: 'rotate(-5deg)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 13l4 4c4-7.5 8-10 12-12" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 leading-normal text-justify select-none">
                {isMaiorDeIdade ? (
                  <>
                    Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações
                    prestadas são verdadeiras e concordo com os{' '}
                    <a
                      href="/termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </a>{' '}
                    e a{' '}
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </a>
                    , autorizando a emissão eletrônica.{' '}
                    <span className="text-red-500 font-bold">*</span>
                  </>
                ) : (
                  <>
                    Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações
                    prestadas são verdadeiras, sou responsável legal do menor e concordo com os{' '}
                    <a
                      href="/termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </a>{' '}
                    e a{' '}
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </a>
                    , autorizando a emissão eletrônica.{' '}
                    <span className="text-red-500 font-bold">*</span>
                  </>
                )}
              </span>
            </label>
          </div>

          {/* Mensagem de Erro do OTP */}
          {otpError && (
            <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-[11px] font-medium flex items-start gap-2 border border-red-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
              <span className="leading-snug">{otpError}</span>
            </div>
          )}

          {/* Botões de Ação na Folha A5 */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 text-xs font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={onConfirmSign}
              disabled={
                otpCode.length < 6 ||
                !declarationLegalResponsibility ||
                !hasSignature ||
                submittingSign
              }
              className="w-full sm:flex-1 py-3 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer active:scale-[0.99]"
            >
              {submittingSign ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Finalizando Assinatura...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar e Concluir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Barra institucional azul sólida no final da folha A5 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10px',
            backgroundColor: '#034b7f',
          }}
        />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
