import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Mail,
  CheckCircle2,
  RefreshCw,
  X,
  Lock,
  User,
  Fingerprint,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { SignerRelationship } from '../../lib/types.ts';

interface Step3OtpAndSignatureProps {
  token: string;
  minorName: string;
  minorBirthDate?: string;
  procedureTitle: string;
  institutionName?: string;
  identityData: {
    signerName: string;
    signerCpf: string;
    signerEmail?: string;
    signerPhone?: string;
    signerRelationship: SignerRelationship;
    identityMethod: 'matricula_sesi' | 'manual_review';
    minorCpf?: string;
    minorSeries?: string;
    minorClass?: string;
    minorTurn?: string;
  };
  onSuccess: (signResult: any) => void;
  onBack: () => void;
}

export const Step3OtpAndSignature: React.FC<Step3OtpAndSignatureProps> = ({
  token,
  minorName,
  minorBirthDate,
  procedureTitle: _procedureTitle,
  institutionName,
  identityData,
  onSuccess,
  onBack,
}) => {
  const [authHealth, setAuthHealth] = useState(false);
  const [authData, setAuthData] = useState(false);
  const [authImage, setAuthImage] = useState(false);
  const [readAndAccept, setReadAndAccept] = useState(false);
  const [otpChannel] = useState<'email' | 'sms'>('email');
  const [declarationLegalResponsibility, setDeclarationLegalResponsibility] = useState(false);

  const [submittingSign, setSubmittingSign] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados da Validação por Código de E-mail (OTP 6 Dígitos)
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [signaturePngBase64, setSignaturePngBase64] = useState<string>('');

  // Geolocalização e IP reais do cliente (sem fallbacks hardcoded)
  const [clientGeo, setClientGeo] = useState<{ ip: string; location: string }>({
    ip: '',
    location: '',
  });

  useEffect(() => {
    // 1. Obtém IP público real imediatamente
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json() as Promise<any>)
      .then((data: any) => {
        if (data && data.ip) {
          setClientGeo((prev) => ({ ...prev, ip: data.ip }));
        }
      })
      .catch(() => {});

    // 2. Obtém geolocalização e IP completos via IP de forma 100% silenciosa e automática (sem pedir permissão ao usuário)
    fetch('https://ipwho.is/')
      .then((r) => r.json() as Promise<any>)
      .then((data: any) => {
        if (data && data.success) {
          const locParts = [data.city, data.region_code].filter(Boolean).join(', ');
          const fullLoc = locParts ? `${locParts} - ${data.country || 'Brasil'}` : (data.country || 'Brasil');
          setClientGeo((prev) => ({
            ip: data.ip || prev.ip,
            location: fullLoc,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Temporizador para reenvio de código
  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  /**
   * Envia o código OTP de 6 dígitos para o e-mail do responsável
   */
  const dispararEnvioOtpEmail = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      const resp = await apiClient.requestOtp(
        token, 
        otpChannel, 
        identityData.signerEmail || undefined, 
        minorName || undefined,
        undefined,
        identityData.signerPhone || undefined
      );
      if (resp.success) {
        if (resp.email_sent === false && resp.email_error) {
          setOtpError(`Erro no envio da mensagem: ${resp.email_error}`);
        } else {
          setResendCooldown(60);
        }
      } else {
        setOtpError(resp.error || 'Falha ao enviar código de verificação.');
      }
    } catch {
      setOtpError('Erro ao comunicar com o servidor de envio de código.');
    } finally {
      setOtpSending(false);
    }
  };

  /**
   * Valida as opções do formulário e abre a etapa de verificação por E-mail
   */
  const handleInitiateSign = async () => {
    if (!authHealth) {
      setErrorMessage('Para que o estudante participe do projeto, marque a opção autorizando os atendimentos de saúde.');
      return;
    }

    if (!authData) {
      setErrorMessage('Para prosseguir com segurança jurídica, confirme a autorização para o tratamento de dados pessoais (LGPD).');
      return;
    }

    if (!readAndAccept) {
      setErrorMessage('Por favor, confirme que você leu e concorda com as condições do Termo de Consentimento.');
      return;
    }

    setErrorMessage('');
    setOtpError('');
    setOtpCode('');
    setOtpSent(true);
    setShowOtpModal(true);
    await dispararEnvioOtpEmail();
  };

  /**
   * Valida o código OTP de 6 dígitos e conclui a assinatura eletrônica
   */
  const handleVerifyAndFinalizeSign = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Por favor, digite o código de segurança completo de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    if (!declarationLegalResponsibility) {
      setOtpError('Confirme a declaração de veracidade e responsabilidade legal para prosseguir.');
      return;
    }

    if (!signaturePngBase64) {
      setOtpError('Por favor, faça o desenho da sua assinatura na área indicada antes de concluir.');
      return;
    }

    setSubmittingSign(true);
    setOtpError('');

    try {
      // 1. Valida o código OTP informado
      const otpVerifyResp = await apiClient.verifyOtp(token, cleanOtp);
      if (!otpVerifyResp.success) {
        setOtpError(otpVerifyResp.error || 'Código incorreto ou expirado. Verifique sua caixa de entrada.');
        setSubmittingSign(false);
        return;
      }

      // 2. Submete a assinatura com o código OTP confirmado e o desenho base64 da assinatura
      const resp = await apiClient.signDocument({
        token,
        otp_code: cleanOtp,
        signer_name: identityData.signerName,
        signer_cpf: identityData.signerCpf,
        signer_relationship: identityData.signerRelationship,
        signer_email: identityData.signerEmail,
        signer_phone: identityData.signerPhone,
        minor_name: minorName,
        minor_birth_date: minorBirthDate,
        minor_cpf: identityData.minorCpf,
        minor_series: identityData.minorSeries,
        minor_class: identityData.minorClass,
        minor_turn: identityData.minorTurn,
        institution_name: institutionName,
        auth_health: authHealth ? 'yes' : 'no',
        auth_data: authData ? 'yes' : 'no',
        auth_image: authImage ? 'yes' : 'no',
        signature_png_base64: signaturePngBase64,
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        declaration_legal_responsibility: true,
        client_fingerprint: `${navigator.language}_${screen.width}x${screen.height}`,
        ip_address: clientGeo.ip || undefined,
        geolocation: clientGeo.location || undefined,
        user_agent: navigator.userAgent,
        identity_method: identityData.identityMethod,
      });

      if (resp.success) {
        setOtpSent(false);
        setShowOtpModal(false);
        onSuccess({ ...resp, otp_channel: otpChannel });
      } else {
        const errMsg = resp.error || 'Falha ao registrar a assinatura.';
        setOtpError(errMsg);
        setErrorMessage(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Erro inesperado ao registrar assinatura.';
      setOtpError(errMsg);
      setErrorMessage(errMsg);
    } finally {
      setSubmittingSign(false);
    }
  };

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3 mb-4 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial */}
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
              Escola Cidadã — Saúde em Movimento
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Termo de Consentimento (TCLE)
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-800">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                2. RESUMO DO TERMO DE CONSENTIMENTO E AUTORIZAÇÕES
              </h2>
              <div className="space-y-4 text-justify text-slate-700 leading-relaxed text-xs sm:text-sm pt-2">
                <p>
                  Para que o(a) estudante participe das atividades do projeto itinerante “Escola Cidadã — Saúde em Movimento” (parceria UnB e SESI-DF), pedimos o seu consentimento. Os dados informados são usados exclusivamente para o registro desta autorização e são protegidos nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                </p>
                <p>
                  Você pode solicitar o acesso, a correção ou o cancelamento desta autorização a qualquer momento, procurando a coordenação da escola ou a equipe de apoio presencial.
                </p>
                <p>
                  Ao assinar, você confirma que é o(a) responsável legal pelo(a) menor e que as informações prestadas são verdadeiras. O registro é feito de forma eletrônica através da plataforma Catraki, constituindo <strong>Assinatura Eletrônica Avançada</strong> nos termos do <strong>Art. 4º, II, da Lei nº 14.063/2020</strong>, do <strong>Art. 10, §2º, da MP 2.200-2/2001</strong>, da <strong>LGPD (Lei nº 13.709/2018)</strong> e do <strong>ECA (Art. 17)</strong>, com respaldo da jurisprudência do STJ (REsp 2.205.708/PR).
                </p>
              </div>
            </div>

            {/* Painel de Aceites Granulares (4 Campos) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 mt-4">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 m-0 border-b border-slate-200 pb-2">
                Opções de Consentimento e Declaração
              </h3>
              
              <div className="space-y-3">
                {/* Campo 1: Atendimento de Saúde */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={authHealth}
                    onChange={(e) => setAuthHealth(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <strong>SIM, AUTORIZO</strong> o atendimento de saúde do estudante (odontologia, oftalmologia, fonoaudiologia, psicologia e nutrição) nas unidades móveis durante o período escolar. <span className="text-red-500 font-bold">* (Obrigatório)</span>
                  </span>
                </label>

                {/* Campo 2: Tratamento de Dados */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={authData}
                    onChange={(e) => setAuthData(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <strong>SIM, AUTORIZO</strong> o uso dos dados pessoais informados exclusivamente para registrar este termo com segurança, conforme a Lei Geral de Proteção de Dados (LGPD). <span className="text-red-500 font-bold">* (Obrigatório)</span>
                  </span>
                </label>

                {/* Campo 3: Uso de Imagem */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={authImage}
                    onChange={(e) => setAuthImage(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <strong>SIM, AUTORIZO</strong> o uso gratuito de fotos e vídeos do estudante para relatórios e divulgação oficial do projeto. <span className="text-slate-500 font-normal">(Opcional)</span>
                  </span>
                </label>

                {/* Campo 4: Declaração Geral de Aceite */}
                <label className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={readAndAccept}
                    onChange={(e) => setReadAndAccept(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-900 font-bold leading-relaxed">
                    DECLARO QUE LI e concordo com todas as informações deste termo e autorizo a assinatura eletrônica por código de segurança e desenho na tela. <span className="text-red-500 font-bold">* (Obrigatório)</span>
                  </span>
                </label>
              </div>
            </div>

          {/* 5. ASSINATURA ELETRÔNICA E VALIDAÇÃO DE IDENTIDADE */}
          <div className="pt-5 sm:pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#034b7f] m-0 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-sesi-primary shrink-0" />
                <span>5. Assinatura Eletrônica e Validação</span>
              </h3>
              <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold border border-slate-200/60">
                Resguardo legal: Art. 4º, II, Lei 14.063/2020 | MP 2.200-2/2001 | LGPD | ECA Art. 17
              </span>
            </div>

            {/* Painel Formal de Identificação do Signatário */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs text-left">
              
              {/* Grid de Informações com layout profissional */}
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assinante / Responsável Legal</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-900 font-bold text-xs sm:text-sm leading-tight">{identityData.signerName}</strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Documento de Identificação (CPF)</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-800 font-mono text-xs sm:text-sm leading-tight">{identityData.signerCpf}</strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Vínculo com o Estudante</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-800 text-xs sm:text-sm leading-tight">{identityData.signerRelationship}</strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">E-mail Cadastrado</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-800 text-xs sm:text-sm leading-tight truncate">{identityData.signerEmail}</strong>
                  </div>
                </div>
              </div>

              {/* Seção Informativa de Segurança */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-150 space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-sesi-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-justify">
                    <strong className="text-slate-800 block">Confirmação de Segurança por E-mail:</strong>
                    <p className="m-0 text-xs text-slate-500">
                      Para concluir a assinatura e garantir a integridade do processo, um código temporário de 6 dígitos será enviado para <span className="text-slate-900 font-bold select-all break-all">{identityData.signerEmail}</span>.
                    </p>
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-[10px] sm:text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Código de segurança expira em 5 minutos</span>
                </div>
              </div>

            </div>
          </div>

          {/* Botoes de acoes no A4 */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleInitiateSign}
                disabled={
                  !authHealth ||
                  !authData ||
                  !readAndAccept ||
                  otpSending
                }
                className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
              >
                {otpSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disparando código...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar Código e Assinar</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOtpModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Inserir Código e Assinar (Reabrir Pop-up)</span>
              </button>
            )}
          </div>
        </div>

        {/* MODAL DE VERIFICAÇÃO DE CÓDIGO POR E-MAIL (FOLHA A5) */}
        {showOtpModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            
            {/* Folha A5 — Padrão Formal (148mm x 210mm) */}
            <div
              className="w-full max-w-[500px] animate-in zoom-in-95 duration-200"
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
                onClick={() => setShowOtpModal(false)}
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
                  <p style={{ fontSize: '7.5pt', color: '#555', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Escola Cidadã • SESI Saúde
                  </p>
                  <p style={{ fontSize: '8pt', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
                    Validação de Identidade
                  </p>
                  <p style={{ fontSize: '7pt', color: '#888', margin: 0 }}>
                    {dataHoje}
                  </p>
                </div>
              </div>

              {/* Título da Folha A5 */}
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h1 style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#000', margin: '0 0 4px 0', letterSpacing: '0.02em' }}>
                  CONFIRMAÇÃO DE SEGURANÇA DA ASSINATURA
                </h1>
                <h2 style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#475569', margin: 0 }}>
                  Validação rápida por código enviado ao seu e-mail
                </h2>
              </div>

              {/* Corpo do Documento A5 */}
              <div className="space-y-3.5">
                <p style={{ textAlign: 'justify', fontSize: '9.5pt', color: '#334155', margin: 0, lineHeight: '1.5' }}>
                  Para confirmar a assinatura da autorização do(a) estudante <strong>{minorName}</strong>, enviamos um código de segurança de 6 dígitos para o e-mail:
                </p>

                <div className="bg-blue-50/80 border border-blue-200 rounded-md p-2.5 text-center">
                  <span className="font-mono font-bold text-sesi-primary text-xs tracking-wide select-all break-all">
                    {identityData.signerEmail}
                  </span>
                </div>

                {/* Checkbox de Responsabilidade Legal mandatória (Validade Jurídica) */}
                <div className="pt-1.5 pb-1">
                  <label htmlFor="field-declarationLegalResponsibility" className="flex items-start gap-2.5 p-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-lg bg-slate-50 cursor-pointer select-none transition-colors">
                    <input
                      id="field-declarationLegalResponsibility"
                      name="declarationLegalResponsibility"
                      type="checkbox"
                      checked={declarationLegalResponsibility}
                      onChange={(e) => setDeclarationLegalResponsibility(e.target.checked)}
                      className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-normal text-justify">
                      Confirmo que sou o(a) responsável legal pelo(a) estudante e autorizo a emissão deste documento digital através da plataforma Catraki.
                    </span>
                  </label>
                </div>

                {/* Quadro de Assinatura por Desenho */}
                <SignaturePad
                  onSave={(base64) => setSignaturePngBase64(base64)}
                  onClear={() => setSignaturePngBase64('')}
                />

                {/* Mensagem de Erro do OTP */}
                {otpError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span className="font-semibold">{otpError}</span>
                  </div>
                )}

                {/* Campo do Código OTP */}
                <div className="space-y-1 pt-1">
                  <label className="block text-center text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Insira o Código de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="w-full text-center tracking-[0.5em] text-xl font-mono font-extrabold py-2.5 px-3 bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-sesi-primary focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-slate-900"
                  />
                  <span className="block text-center text-[9px] text-slate-400 leading-tight">
                    * Por medidas de segurança, são permitidas até 3 tentativas de digitação e 8 reenvios do código por documento.
                  </span>
                </div>

                {/* Reenvio de Código */}
                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Reenviar novo código em {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={dispararEnvioOtpEmail}
                      disabled={otpSending}
                      className="text-[11px] text-sesi-primary hover:text-blue-900 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                      {otpSending ? 'Enviando...' : 'Não recebeu? Reenviar código'}
                    </button>
                  )}
                </div>

                {/* Botões de Ação na Folha A5 */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleVerifyAndFinalizeSign}
                    disabled={otpCode.length < 6 || !declarationLegalResponsibility || !signaturePngBase64 || submittingSign}
                    className="w-full py-2.5 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submittingSign ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Confirmando Assinatura...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmar e Concluir Assinatura
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer text-center"
                  >
                    Cancelar e Voltar ao Termo
                  </button>
                </div>
              </div>

              {/* Barra institucional no final da folha A5 */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
                <img
                  src="/barra.jpg"
                  alt="Barra institucional SESI"
                  style={{ width: '100%', height: '20px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Barra institucional no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          3
        </div>
      </div>
    </div>
  );
};

interface SignaturePadProps {
  onSave: (base64Png: string) => void;
  onClear: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Ajusta o tamanho real do canvas para coincidir com o tamanho visível (responsivo)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 120; // altura fixa desejada
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#034b7f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);

    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  return (
    <div className="space-y-1 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-slate-500 uppercase">
          Assinatura Manual (Desenhe abaixo) <span className="text-red-500">*</span>
        </label>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 relative group select-none">
        {/* Marca d'água de proteção no fundo do quadro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-25 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest text-slate-400 rotate-[-6deg] space-y-1">
          <span>CATRAKI DIGITAL • ASSINATURA ELETRÔNICA</span>
          <span>USO EXCLUSIVO NESTE TERMO • NÃO COPIAR</span>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-[120px] block cursor-crosshair touch-none relative z-10 select-none"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-[11px] font-semibold font-sans z-20 bg-slate-50/40">
            Desenhe sua assinatura aqui
          </div>
        )}
      </div>
    </div>
  );
};

