import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Mail,
  CheckCircle2,
  Lock,
  User,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react';
import { apiClient, captureDeviceFingerprint } from '../../lib/api.ts';
import { calcularIdade, maskCPF } from '../../lib/schemas.ts';
import type { SignerRelationship } from '../../lib/types.ts';
import { ConsentOptions } from './ConsentOptions.tsx';
import { OtpSignatureModal } from './OtpSignatureModal.tsx';
import { useOtpVerification } from '../../hooks/useOtpVerification.ts';

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
    identityMethod: 'declaracao_responsavel' | 'declaracao_titular';
    minorCpf?: string;
    minorSeries?: string;
    minorClass?: string;
    minorTurn?: string;
  };
  onSuccess: (signResult: any) => void;
  onBack: () => void;
}

/**
 * Step 3: Conferência do TCLE, Aceites Granulares e Conclusão com OTP + Assinatura Manual.
 * Princípio SOLID: Atua como orquestrador limpo (SRP), delegando a lógica de estados do OTP
 * ao hook useOtpVerification e a renderização aos componentes ConsentOptions e OtpSignatureModal.
 */
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
  const isMaiorDeIdade: boolean = !!minorBirthDate && calcularIdade(minorBirthDate, new Date()) >= 18;

  // Estados dos Aceites Granulares
  const [authHealth, setAuthHealth] = useState(false);
  const [authData, setAuthData] = useState(false);
  const [authImage, setAuthImage] = useState(false);
  const [readAndAccept, setReadAndAccept] = useState(false);
  const [declarationLegalResponsibility, setDeclarationLegalResponsibility] = useState(false);

  // Estados de Submissão e Erro
  const [submittingSign, setSubmittingSign] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Hook isolado para máquina de estados do OTP
  const {
    otpSent,
    setOtpSent,
    showOtpModal,
    setShowOtpModal,
    otpCode,
    setOtpCode,
    otpSending,
    otpError,
    setOtpError,
    resendCooldown,
    simulatedOtp,
    signaturePngBase64,
    setSignaturePngBase64,
    requestOtpEmail,
  } = useOtpVerification({
    token,
    signerEmail: identityData.signerEmail,
    minorName,
    signerPhone: identityData.signerPhone,
  });

  // Geolocalização e IP reais do cliente via Cloudflare edge
  const [clientGeo, setClientGeo] = useState<{ ip: string; location: string }>({
    ip: '',
    location: '',
  });

  useEffect(() => {
    apiClient
      .getClientInfo()
      .then((res) => {
        if (res.success && res.client) {
          setClientGeo({
            ip: res.client.ip || '',
            location: res.client.formattedLocation || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  /**
   * Valida preenchimento dos aceites obrigatórios e inicia a etapa de verificação OTP
   */
  const handleInitiateSign = async () => {
    if (!authHealth) {
      setErrorMessage(
        'Para autorizar a participação do(a) estudante, marque a opção de autorização dos atendimentos de saúde.'
      );
      return;
    }

    if (!authData) {
      setErrorMessage(
        'Para que possamos registrar a assinatura com validade legal, é necessário confirmar a autorização de tratamento dos dados pessoais.'
      );
      return;
    }

    if (!readAndAccept) {
      setErrorMessage(
        'Por favor, confirme que você leu e concorda com as condições do Termo de Consentimento.'
      );
      return;
    }

    setErrorMessage('');
    setOtpError('');
    setOtpCode('');
    setOtpSent(true);
    setShowOtpModal(true);
    await requestOtpEmail();
  };

  /**
   * Valida o código OTP de 6 dígitos e submete a assinatura eletrônica com validade jurídica
   */
  const handleVerifyAndFinalizeSign = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Por favor, digite o código de segurança completo de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    if (!declarationLegalResponsibility) {
      setOtpError(
        'Para finalizar, confirme que você é o responsável legal e que todas as informações fornecidas são verdadeiras.'
      );
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
        setOtpError(
          otpVerifyResp.error ||
            'O código informado está incorreto ou expirou. Verifique sua caixa de entrada e, se necessário, solicite um novo código.'
        );
        setSubmittingSign(false);
        return;
      }

      // 2. Submete a assinatura probatória
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
        termos_versao: '1.0.2026',
      });

      if (resp.success) {
        setOtpSent(false);
        setShowOtpModal(false);
        onSuccess({ ...resp, otp_channel: 'email' });
      } else {
        const errMsg =
          resp.error ||
          'Não foi possível registrar a assinatura neste momento. Por favor, tente novamente. Se o problema persistir, entre em contato com a equipe em suporte@catraki.com.br.';
        setOtpError(errMsg);
        setErrorMessage(errMsg);
      }
    } catch (err: any) {
      const errMsg =
        err.message ||
        'Não foi possível registrar a assinatura neste momento. Por favor, tente novamente.';
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
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">{dataHoje}</p>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-800">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              2. RESUMO DO TERMO DE CONSENTIMENTO E AUTORIZAÇÕES
            </h2>
            <div className="space-y-4 text-justify text-slate-700 leading-relaxed text-xs sm:text-sm pt-2">
              <p>
                Para que o(a) estudante participe das atividades do projeto itinerante “Escola
                Cidadã — Saúde em Movimento” (parceria UnB e SESI-DF),{' '}
                {isMaiorDeIdade
                  ? 'pedimos o seu consentimento direto como titular dos dados. O tratamento dos dados de saúde é fundamentado no Art. 11, I e Art. 18 da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e a autorização de imagem e voz no Art. 20 do Código Civil (Lei nº 10.406/2002).'
                  : 'pedimos o consentimento do responsável legal. O tratamento de dados de crianças e adolescentes é fundamentado no Art. 14 e Art. 18 da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o uso de imagem no Art. 17 do ECA (Lei nº 8.069/1990).'}
              </p>
              <p>
                Você pode solicitar o acesso, a correção ou o cancelamento desta autorização a
                qualquer momento, procurando a coordenação da escola ou a equipe de apoio
                presencial.
              </p>
              <p>
                {isMaiorDeIdade ? (
                  <>
                    Ao assinar, você declara, sob as penas da lei (Art. 299 do Código Penal), que as
                    informações prestadas e a identidade declarada são verdadeiras. Além disso,
                    concorda expressamente com a utilização e validade deste método de assinatura
                    eletrônica (Art. 10, § 2º, da MP nº 2.200-2/2001). O registro do consentimento é
                    feito de forma eletrônica pela plataforma Catraki.
                  </>
                ) : (
                  <>
                    Ao assinar, você declara, sob as penas da lei (Art. 299 do Código Penal), que é
                    o(a) responsável legal pelo(a) menor e que as informações prestadas são
                    verdadeiras. Além disso, concorda expressamente com a utilização e validade deste
                    método de assinatura eletrônica (Art. 10, § 2º, da MP nº 2.200-2/2001). O
                    registro do consentimento é feito de forma eletrônica pela plataforma Catraki.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Painel de Aceites Granulares (Componente Isolado) */}
          <ConsentOptions
            authHealth={authHealth}
            setAuthHealth={setAuthHealth}
            authData={authData}
            setAuthData={setAuthData}
            authImage={authImage}
            setAuthImage={setAuthImage}
            readAndAccept={readAndAccept}
            setReadAndAccept={setReadAndAccept}
            isMaiorDeIdade={isMaiorDeIdade}
          />

          {/* Identificação do Signatário e Resguardo Legal */}
          <div className="pt-5 sm:pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1.5">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#004b8d] m-0 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sesi-primary shrink-0" />
                <span>Assinatura Eletrônica</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/50 text-[#004b8d] text-[10px] font-bold border border-blue-100/60 shadow-3xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Resguardo Legal: Art. 10, § 2º, MP 2.200-2 | Lei 14.063/2020 | LGPD</span>
              </span>
            </div>

            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs text-left">
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {isMaiorDeIdade ? 'Estudante / Signatário(a)' : 'Assinante / Responsável Legal'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-900 font-bold text-xs sm:text-sm leading-tight">
                      {identityData.signerName}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Documento de Identificação (CPF)
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-800 font-mono text-xs sm:text-sm leading-tight">
                      {maskCPF(identityData.signerCpf)}
                    </strong>
                  </div>
                </div>

                {!isMaiorDeIdade && (
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Vínculo com o Estudante
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <strong className="text-slate-800 text-xs sm:text-sm leading-tight">
                        {identityData.signerRelationship}
                      </strong>
                    </div>
                  </div>
                )}

                {isMaiorDeIdade && (
                  <div className="space-y-1 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 sm:col-span-1">
                    <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                      Capacidade Civil
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <strong className="text-emerald-800 text-xs sm:text-sm leading-tight">
                        Próprio Estudante (Maior de Idade)
                      </strong>
                    </div>
                  </div>
                )}

                <div className="space-y-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    E-mail Cadastrado
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <strong className="text-slate-800 text-xs sm:text-sm leading-tight truncate">
                      {identityData.signerEmail}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Informação Legal de Privacidade */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-150 space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-sesi-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-justify">
                    <strong className="text-slate-800 block">
                      Confirmação de Segurança por E-mail:
                    </strong>
                    <p className="m-0 text-[11px] text-slate-500 pt-1">
                      Ao assinar este documento, você declara ter lido e concordar com os nossos{' '}
                      <a
                        href="/termos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      >
                        Termos de Uso
                      </a>{' '}
                      e com a nossa{' '}
                      <a
                        href="/privacidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#004b8d] font-bold underline hover:text-blue-900"
                      >
                        Política de Privacidade
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
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
                disabled={!authHealth || !authData || !readAndAccept || otpSending}
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

        {/* Modal de Verificação de Código e Assinatura Manual (Componente Isolado) */}
        <OtpSignatureModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          minorName={minorName}
          signerEmail={identityData.signerEmail}
          isMaiorDeIdade={isMaiorDeIdade}
          dataHoje={dataHoje}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          simulatedOtp={simulatedOtp}
          resendCooldown={resendCooldown}
          otpSending={otpSending}
          onResendOtp={requestOtpEmail}
          onSaveSignature={(base64) => setSignaturePngBase64(base64)}
          onClearSignature={() => setSignaturePngBase64('')}
          hasSignature={!!signaturePngBase64}
          declarationLegalResponsibility={declarationLegalResponsibility}
          setDeclarationLegalResponsibility={setDeclarationLegalResponsibility}
          otpError={otpError}
          submittingSign={submittingSign}
          onConfirmSign={handleVerifyAndFinalizeSign}
        />

        {/* Barra institucional azul sólida no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

        {/* Número de página ABNT */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          3
        </div>
      </div>
    </div>
  );
};
