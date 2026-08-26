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
} from 'lucide-react';
import { StatusAlertScreen } from '../common/StatusAlertScreen.tsx';
import { apiClient, captureDeviceFingerprint } from '../../lib/api.ts';
import { calcularIdade, maskCPF } from '../../lib/schemas.ts';
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
  // Calcula maioridade do estudante de forma dinâmica e precisa
  const isMaiorDeIdade: boolean = !!minorBirthDate && calcularIdade(minorBirthDate, new Date()) >= 18;

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
          setOtpError(`Falha no envio do código: ${resp.email_error}`);
        } else {
          setResendCooldown(60);
        }
      } else {
        setOtpError(resp.error || 'Não foi possível enviar o código de segurança. Tente novamente.');
      }
    } catch {
      setOtpError('Não foi possível enviar o código de segurança no momento. Por favor, aguarde alguns instantes e tente novamente. Se o problema persistir, verifique sua conexão com a internet.');
    } finally {
      setOtpSending(false);
    }
  };

  /**
   * Valida as opções do formulário e abre a etapa de verificação por E-mail
   */
  const handleInitiateSign = async () => {
    if (!authHealth) {
      setErrorMessage('Para autorizar a participação do(a) estudante, marque a opção de autorização dos atendimentos de saúde.');
      return;
    }

    if (!authData) {
      setErrorMessage('Para que possamos registrar a assinatura com validade legal, é necessário confirmar a autorização de tratamento dos dados pessoais.');
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
      setOtpError('Para finalizar, confirme que você é o responsável legal e que todas as informações fornecidas são verdadeiras.');
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
        setOtpError(otpVerifyResp.error || 'O código informado está incorreto ou expirou. Verifique sua caixa de entrada e, se necessário, solicite um novo código.');
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
        device_fingerprint_data: captureDeviceFingerprint(),
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
        const errMsg = resp.error || 'Não foi possível registrar a assinatura neste momento. Por favor, tente novamente. Se o problema persistir, entre em contato com a equipe em suporte@catraki.com.br.';
        setOtpError(errMsg);
        setErrorMessage(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Não foi possível registrar a assinatura neste momento. Por favor, tente novamente.';
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
              PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA
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
                  Para que o(a) estudante participe das atividades do projeto itinerante “Escola Cidadã — Saúde em Movimento” (parceria UnB e SESI-DF), {isMaiorDeIdade ? 'pedimos o seu consentimento direto como titular dos dados. O tratamento dos dados de saúde é fundamentado no Art. 11, I e Art. 18 da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e a autorização de imagem e voz no Art. 20 do Código Civil (Lei nº 10.406/2002).' : 'pedimos o consentimento do responsável legal. O tratamento de dados de crianças e adolescentes é fundamentado no Art. 14 e Art. 18 da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o uso de imagem no Art. 17 do ECA (Lei nº 8.069/1990).'}
                </p>
                <p>
                  Você pode solicitar o acesso, a correção ou o cancelamento desta autorização a qualquer momento, procurando a coordenação da escola ou a equipe de apoio presencial.
                </p>
                <p>
                  {isMaiorDeIdade
                    ? <>Ao assinar, você declara, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas e a identidade declarada são verdadeiras. O registro é feito de forma eletrônica pela plataforma Catraki, constituindo <strong>Assinatura Eletrônica Avançada</strong> nos termos do <strong>Art. 4º, II, da Lei nº 14.063/2020</strong>, do <strong>Art. 10, §2º, da MP 2.200-2/2001</strong> e dos <strong>Arts. 11, I e 18 da LGPD (Lei nº 13.709/2018)</strong>, com respaldo da jurisprudência do STJ (REsp 2.205.708/PR).</>
                    : <>Ao assinar, você declara, sob as penas da lei (Art. 299 do Código Penal), que é o(a) responsável legal pelo(a) menor e que as informações prestadas são verdadeiras. O registro é feito de forma eletrônica pela plataforma Catraki, constituindo <strong>Assinatura Eletrônica Avançada</strong> nos termos do <strong>Art. 4º, II, da Lei nº 14.063/2020</strong>, do <strong>Art. 10, §2º, da MP 2.200-2/2001</strong>, da <strong>LGPD (Lei nº 13.709/2018)</strong> e do <strong>ECA (Art. 17 — Lei nº 8.069/1990)</strong>, com respaldo da jurisprudência do STJ (REsp 2.205.708/PR).</>
                  }
                </p>
              </div>
            </div>

            {/* Painel de Aceites Granulares (4 Campos) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 mt-4">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 m-0 border-b border-slate-200 pb-2">
                Opções de Consentimento e Declaração
              </h3>
              
              <div className="space-y-3">
                {/* Campo 1: Atendimento de Saúde com Granularidade */}
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={authHealth}
                      onChange={(e) => setAuthHealth(e.target.checked)}
                      className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                       <strong>SIM, AUTORIZO</strong> o atendimento preventivo de saúde do(a) estudante nas unidades móveis do projeto, incluindo as especialidades de <strong>Oftalmologia (exame de vista)</strong>, <strong>Odontologia (saúde bucal)</strong>, <strong>Fonoaudiologia (audiometria)</strong>, <strong>Terapia Comunitária Integrativa</strong> e <strong>Nutrição (alimentação saudável)</strong>, durante o período escolar. <span className="text-red-500 font-bold">* (Obrigatório)</span>
                    </span>
                  </label>
                </div>

                {/* Campo 2: Tratamento de Dados (Art. 11/18 vs Art. 14/18) */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={authData}
                    onChange={(e) => setAuthData(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {isMaiorDeIdade
                      ? <><strong>SIM, AUTORIZO</strong> o tratamento dos meus dados pessoais e dados de saúde exclusivamente para fins de identificação e validação legal da permissão de atendimento (Art. 11, I e Art. 18 da LGPD). <span className="text-red-500 font-bold">* (Obrigatório)</span></>
                      : <><strong>SIM, AUTORIZO</strong> o tratamento dos dados pessoais informados exclusivamente para registrar a autorização do menor com segurança, nos termos do Art. 14 e Art. 18 da LGPD. <span className="text-red-500 font-bold">* (Obrigatório)</span></>
                    }
                  </span>
                </label>

                {/* Campo 3: Uso de Imagem e Voz (Art. 20 CC vs Art. 17 ECA) */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={authImage}
                    onChange={(e) => setAuthImage(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <strong>SIM, AUTORIZO</strong> o registro fotográfico e/ou audiovisual do(a) estudante para fins institucionais e de divulgação oficial do projeto Escola Cidadã — Saúde em Movimento ({isMaiorDeIdade ? 'Art. 20 do Código Civil' : 'Art. 17 do ECA'}), em materiais produzidos pelo SESI-DF e pela UnB. <span className="text-slate-500 font-normal">(Opcional — a recusa não impede a participação.)</span>
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
                     <strong>Declaro que li e compreendi</strong> todas as informações deste Termo de Consentimento e concordo em assinar eletronicamente, confirmando a veracidade de todas as declarações prestadas sob as penas da lei (Art. 299 do Código Penal). <span className="text-red-500 font-bold">* (Obrigatório)</span>
                   </span>
                </label>
              </div>
            </div>

          {/* ASSINATURA ELETRÔNICA E VALIDAÇÃO DE IDENTIDADE */}
          <div className="pt-5 sm:pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#004b8d] m-0 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sesi-primary shrink-0" />
                <span>Assinatura Eletrônica</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/50 text-[#004b8d] text-[10px] font-bold border border-blue-100/60 shadow-3xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Resguardo Legal: Art. 4º, II, Lei 14.063/2020 | MP 2.200-2 | LGPD</span>
              </span>
            </div>

            {/* Painel Formal de Identificação do Signatário */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs text-left">
              
              {/* Grid de Informações com layout profissional */}
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {isMaiorDeIdade ? 'Estudante / Signatário(a)' : 'Assinante / Responsável Legal'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-900 font-bold text-xs sm:text-sm leading-tight">{identityData.signerName}</strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Documento de Identificação (CPF)</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {/* CPF mascarado na tela (LGPD Art. 46) — dado completo apenas no PDF forense */}
                    <strong className="text-slate-800 font-mono text-xs sm:text-sm leading-tight">{maskCPF(identityData.signerCpf)}</strong>
                  </div>
                </div>

                {!isMaiorDeIdade && (
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Vínculo com o Estudante</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <strong className="text-slate-800 text-xs sm:text-sm leading-tight">{identityData.signerRelationship}</strong>
                    </div>
                  </div>
                )}

                {isMaiorDeIdade && (
                  <div className="space-y-1 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 sm:col-span-1">
                    <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Capacidade Civil</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <strong className="text-emerald-800 text-xs sm:text-sm leading-tight">Próprio Estudante (Maior de Idade)</strong>
                    </div>
                  </div>
                )}

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
                    Escola Cidadã — Saúde em Movimento
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
              <div className="space-y-4">
                
                {/* Instrução com email destacado em pill */}
                <p className="text-xs sm:text-sm text-slate-600 m-0 leading-relaxed text-justify">
                  Para assinar a autorização do(a) estudante <strong>{minorName}</strong>, enviamos um código de 6 dígitos para o e-mail:
                  <span className="inline-block bg-blue-50 text-sesi-primary border border-blue-100 font-mono font-bold text-xs px-2 py-0.5 rounded ml-1 select-all break-all">
                    {identityData.signerEmail}
                  </span>.
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
                      onClick={dispararEnvioOtpEmail}
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
                  <SignaturePad
                    onSave={(base64) => setSignaturePngBase64(base64)}
                    onClear={() => setSignaturePngBase64('')}
                  />
                </div>

                {/* 3. Declaração de Responsabilidade e Veracidade (Art. 299 do Código Penal) */}
                <div className="pt-1.5">
                  <label htmlFor="field-declarationLegalResponsibility" className="flex items-start gap-2.5 p-3 border border-slate-200 hover:border-blue-200 rounded-xl bg-slate-50/50 hover:bg-blue-50/10 cursor-pointer select-none transition-all">
                    <input
                      id="field-declarationLegalResponsibility"
                      name="declarationLegalResponsibility"
                      type="checkbox"
                      checked={declarationLegalResponsibility}
                      onChange={(e) => setDeclarationLegalResponsibility(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#004b8d] border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 leading-normal text-justify select-none">
                      {isMaiorDeIdade
                        ? <>Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas e a identidade declarada são verdadeiras, e autorizo a emissão deste documento digital através da plataforma Catraki. <span className="text-red-500 font-bold">*</span></>
                        : <>Declaro, sob as penas da lei (Art. 299 do Código Penal), que as informações prestadas são verdadeiras, que sou o(a) responsável legal do menor e autorizo a emissão deste documento digital através da plataforma Catraki. <span className="text-red-500 font-bold">*</span></>
                      }
                    </span>
                  </label>
                </div>

                {/* Mensagem de Erro do OTP com UX Copy Oficial */}
                {otpError && (
                  <StatusAlertScreen
                    scenario="otp_auth_failed"
                    customReason={otpError}
                    primaryActionLabel="Reenviar código de segurança"
                    onPrimaryAction={dispararEnvioOtpEmail}
                  />
                )}

                {/* Botões de Ação na Folha A5 */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleVerifyAndFinalizeSign}
                    disabled={otpCode.length < 6 || !declarationLegalResponsibility || !signaturePngBase64 || submittingSign}
                    className="w-full py-3 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer active:scale-[0.99]"
                  >
                    {submittingSign ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Finalizando Assinatura...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar e Concluir Assinatura</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="w-full py-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-center"
                  >
                    Cancelar e Voltar ao Termo
                  </button>
                </div>
              </div>

              {/* Barra institucional azul sólida no final da folha A5 (Padronizada) */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10px', backgroundColor: '#034b7f' }} />
            </div>
          </div>
        )}

        {/* Barra institucional azul sólida no final da folha (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

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
      <div className="flex items-center justify-between min-h-[16px]">
        <div />
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
          <span>ASSINATURA ELETRÔNICA</span>
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

