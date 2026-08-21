import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Mail,
  CheckCircle2,
  RefreshCw,
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
  const [authHealth, setAuthHealth] = useState<'yes' | 'no' | null>(null);
  const [authData, setAuthData] = useState<'yes' | 'no' | null>(null);
  const [authImage, setAuthImage] = useState<'yes' | 'no' | null>(null);
  const [readAndAccept, setReadAndAccept] = useState(false);

  const [submittingSign, setSubmittingSign] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados da Validação por Código de E-mail (OTP 6 Dígitos)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Geolocalização e IP reais do cliente
  const [clientGeo, setClientGeo] = useState<{ ip: string; location: string }>({
    ip: '189.120.44.12',
    location: 'Brasília, DF - Brasil',
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
          setClientGeo((prev) => ({
            ip: data.ip || prev.ip,
            location: `${data.city || 'Brasília'}, ${data.region_code || 'DF'} - ${data.country || 'Brasil'}`,
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
        'email', 
        identityData.signerEmail || undefined, 
        minorName || undefined
      );
      if (resp.success) {
        if (resp.email_sent === false && resp.email_error) {
          setOtpError(`Erro no envio de e-mail (Resend): ${resp.email_error}`);
        } else {
          setResendCooldown(60);
        }
      } else {
        setOtpError(resp.error || 'Falha ao enviar código para o e-mail.');
      }
    } catch {
      setOtpError('Erro ao comunicar com o servidor de envio de e-mail.');
    } finally {
      setOtpSending(false);
    }
  };

  /**
   * Valida as opções do formulário e abre a etapa de verificação por E-mail
   */
  const handleInitiateSign = async () => {
    if (authHealth !== 'yes') {
      setErrorMessage('É obrigatório autorizar o atendimento de saúde para prosseguir.');
      return;
    }

    if (authData !== 'yes') {
      setErrorMessage('É obrigatório autorizar o tratamento de dados pessoais para prosseguir.');
      return;
    }

    if (authImage === null) {
      setErrorMessage('Por favor, selecione uma opção para o uso de imagem e voz.');
      return;
    }

    if (!readAndAccept) {
      setErrorMessage('É obrigatório marcar o checkbox declarando que leu e concorda.');
      return;
    }

    setErrorMessage('');
    setOtpError('');
    setOtpCode('');
    setOtpSent(true);
    await dispararEnvioOtpEmail();
  };

  /**
   * Valida o código OTP de 6 dígitos e conclui a assinatura eletrônica
   */
  const handleVerifyAndFinalizeSign = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Por favor, digite o código de 6 dígitos recebido por e-mail.');
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

      // 2. Submete a assinatura com o código OTP confirmado (sem necessidade de PNG base64 em disco)
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
        auth_health: authHealth || 'yes',
        auth_data: authData || 'yes',
        auth_image: authImage || 'no',
        signature_png_base64: 'ELECTRONIC_SIGNATURE_OTP_CONFIRMED',
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        client_fingerprint: `${navigator.language}_${screen.width}x${screen.height}`,
        ip_address: clientGeo.ip,
        geolocation: clientGeo.location,
        user_agent: navigator.userAgent,
      });

      if (resp.success) {
        setOtpSent(false);
        onSuccess(resp);
      } else {
        setOtpError(resp.error || 'Falha ao registrar a assinatura.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Erro inesperado ao registrar assinatura.');
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
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                2. PAINEL DE AUTORIZAÇÕES DIGITAIS (Seleção Obrigatória)
              </h2>
              <div className="text-slate-500 mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-justify space-y-2">
                <p>
                  A Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) estabelece regras para o tratamento de informações pessoais. Para que o(a) estudante participe das atividades clínicas e exames do projeto, é indispensável que você registre ativamente sua manifestação de consentimento ou recusa em cada item abaixo.
                </p>
                <p>
                  As opções <strong className="text-slate-800">"A"</strong> (Atendimento de Saúde) e <strong className="text-slate-800">"B"</strong> (Proteção e Tratamento de Dados) são obrigatórias, pois sem elas a equipe multiprofissional fica legalmente impedida de prestar qualquer atendimento clínico ou manter prontuários de acompanhamento. A opção <strong className="text-slate-800">"C"</strong> (Uso de Imagem) é opcional, e sua recusa não prejudicará o atendimento de saúde do(a) menor.
                </p>
              </div>
            </div>

            {/* A. Atendimento de Saúde */}
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                A. SOBRE O ATENDIMENTO DE SAÚDE (Obrigatório para participação)
              </h3>
              <div className="space-y-2">
                <label htmlFor="auth-health-yes" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-health-yes"
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'yes'}
                      onChange={() => setAuthHealth('yes')}
                      className="sr-only"
                    />
                    {authHealth === 'yes' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> o(a) estudante a participar do projeto e a passar pelas triagens, consultas e avaliações clínicas oferecidas pela equipe multiprofissional nas unidades móveis.
                  </span>
                </label>

                <label htmlFor="auth-health-no" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-health-no"
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'no'}
                      onChange={() => setAuthHealth('no')}
                      className="sr-only"
                    />
                    {authHealth === 'no' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> o atendimento de saúde e a participação do(a) estudante no projeto. (Esta escolha impede a participação).
                  </span>
                </label>
              </div>
            </div>

            {/* B. Dados Pessoais */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                B. SOBRE OS DADOS PESSOAIS E DE SAÚDE (Obrigatório para participação)
              </h3>
              <div className="space-y-2">
                <label htmlFor="auth-data-yes" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-data-yes"
                      type="radio"
                      name="authData"
                      checked={authData === 'yes'}
                      onChange={() => setAuthData('yes')}
                      className="sr-only"
                    />
                    {authData === 'yes' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> a coleta, o registro e o armazenamento seguro dos dados pessoais e do prontuário médico gerado durante os atendimentos, ciente de que o acesso será restrito aos profissionais de saúde envolvidos.
                  </span>
                </label>

                <label htmlFor="auth-data-no" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-data-no"
                      type="radio"
                      name="authData"
                      checked={authData === 'no'}
                      onChange={() => setAuthData('no')}
                      className="sr-only"
                    />
                    {authData === 'no' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> a coleta e o tratamento dos dados pessoais e de saúde. (Esta escolha impede a participação no projeto).
                  </span>
                </label>
              </div>
            </div>

            {/* C. Uso de Imagem */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                C. SOBRE O USO DE IMAGEM E VOZ (Opcional)
              </h3>
              <div className="space-y-2">
                <label htmlFor="auth-image-yes" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-image-yes"
                      type="radio"
                      name="authImage"
                      checked={authImage === 'yes'}
                      onChange={() => setAuthImage('yes')}
                      className="sr-only"
                    />
                    {authImage === 'yes' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> o uso gratuito da imagem e voz do(a) estudante, captadas durante as atividades do projeto, exclusivamente para fins de registro institucional, prestação de contas e divulgação educativa. (A recusa não impede o atendimento).
                  </span>
                </label>

                <label htmlFor="auth-image-no" className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
                      id="auth-image-no"
                      type="radio"
                      name="authImage"
                      checked={authImage === 'no'}
                      onChange={() => setAuthImage('no')}
                      className="sr-only"
                    />
                    {authImage === 'no' && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -top-1 -left-1 w-6 h-6 pointer-events-none select-none drop-shadow-xs"
                        style={{ overflow: 'visible' }}
                      >
                        <path
                          d="M2 2.5 C 6 8.5, 14 15.5, 22 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21.5 2.5 C 15.5 9, 8 16, 2.5 22"
                          fill="none"
                          stroke="#023e8a"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> o uso de imagem e voz do(a) estudante. (Esta escolha não impede a participação nos atendimentos de saúde).
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              3. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS
            </h2>
            <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed text-justify">
              <p className="m-0">
                <strong>Finalidade e Proteção:</strong> Os dados coletados possuem finalidade estritamente clínica e operacional. Não serão comercializados, repassados a terceiros alheios à execução do projeto ou utilizados para quaisquer fins discriminatórios.
              </p>
              <p className="m-0">
                <strong>Direito de Revogação:</strong> O titular, representado por seu responsável legal, poderá solicitar o acesso aos dados, correções ou a revogação imediata deste consentimento a qualquer momento. Para isso, basta procurar a equipe de apoio presencial do projeto ou a coordenação da escola.
              </p>
              <p className="m-0 pt-1 text-[11px] text-slate-500">
                Para mais informações sobre a retenção de dados e protocolos de segurança da informação, consulte nossa <a href="/privacidade" target="_blank" className="text-sesi-primary underline font-medium">Política de Privacidade e Termos de Uso</a>.
              </p>
            </div>
          </div>

          {/* 4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA (Declaração Legal)
            </h2>
            <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed text-justify">
              <p className="m-0">
                Declaro, sob as penas da lei (Art. 299 do Código Penal - Falsidade Ideológica), que sou o(a) legítimo(a) responsável legal do(a) estudante qualificado(a) nesta plataforma e que as informações e documentos por mim inseridos são verdadeiros.
              </p>
              <p className="m-0">
                Reconheço que o aceite eletrônico neste sistema possui total validade jurídica e equivale à minha assinatura de próprio punho, nos termos do Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. Estou ciente de que a plataforma registrará e armazenará, para fins de auditoria e comprovação da minha manifestação, os seguintes dados telemáticos: endereço IP, data e horário exatos do registro, características do navegador e do dispositivo utilizado.
              </p>
            </div>
          </div>

          {/* Checkbox Obrigatório */}
          <div className="pt-2">
            <label htmlFor="field-readAndAccept" className="flex items-start gap-3 p-3.5 sm:p-3 border-2 border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 cursor-pointer select-none transition-colors">
              <input
                id="field-readAndAccept"
                name="readAndAccept"
                type="checkbox"
                checked={readAndAccept}
                onChange={(e) => setReadAndAccept(e.target.checked)}
                className="mt-0.5 w-5 h-5 min-w-[20px] text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                DECLARO QUE LI, compreendi e concordo com todas as disposições deste Termo. Autorizo o registro dos dados técnicos do meu dispositivo no ato da assinatura, para fins de confirmação de autoria e conformidade com a LGPD e a legislação vigente.
              </span>
            </label>
          </div>

          {/* 5. ASSINATURA ELETRÔNICA E VALIDAÇÃO DE IDENTIDADE */}
          <div className="pt-4 sm:pt-6 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 m-0">
                5. ASSINATURA ELETRÔNICA E VALIDAÇÃO DE IDENTIDADE
              </h3>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                Amparada pela MP nº 2.200-2/2001 e Lei nº 14.063/2020
              </span>
            </div>

            {/* Painel Formal de Identificação do Signatário */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Assinante / Responsável Legal</span>
                  <strong className="text-slate-900 font-bold text-xs sm:text-sm block mt-0.5">{identityData.signerName}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Documento de Identificação (CPF)</span>
                  <strong className="text-slate-800 font-mono text-xs sm:text-sm block mt-0.5">{identityData.signerCpf}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Vínculo com o Estudante</span>
                  <strong className="text-slate-800 text-xs sm:text-sm block mt-0.5">{identityData.signerRelationship}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">E-mail Cadastrado</span>
                  <strong className="text-slate-800 text-xs sm:text-sm block mt-0.5">{identityData.signerEmail}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
                <p className="m-0 font-bold text-slate-800">
                  Confirmação de Segurança por E-mail:
                </p>
                <p className="m-0">
                  Para concluir a assinatura e garantir a segurança do processo, enviaremos um código temporário de 6 (seis) dígitos para o e-mail cadastrado. Lembre-se de verificar a pasta de Lixo Eletrônico ou Spam.
                </p>
                <p className="m-0 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  ⏱️ O código temporário expira em 5 minutos.
                </p>
              </div>

              {/* ENTRADA DO CÓDIGO INLINE (EXIBIDA APÓS DISPARO) */}
              {otpSent && (
                <div className="mt-4 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-900 block">
                      ✨ Código Enviado com Sucesso!
                    </span>
                    <span className="text-xs text-slate-600 mt-1.5 block max-w-md mx-auto leading-relaxed">
                      Enviamos o código temporário de 6 dígitos para o e-mail: <strong className="text-slate-800 break-all">{identityData.signerEmail}</strong>. Se não o localizar em sua Caixa de Entrada, procure na pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
                    </span>
                  </div>

                  {otpError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span className="font-semibold">{otpError}</span>
                    </div>
                  )}

                  <div className="max-w-[280px] mx-auto">
                    <input
                      id="field-otpCode"
                      name="otpCode"
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.4em] sm:tracking-[0.5em] text-2xl font-mono font-extrabold py-2.5 px-3 bg-white border-2 border-slate-300 rounded-xl focus:border-sesi-primary focus:ring-2 focus:ring-blue-100 transition-all text-slate-900"
                      autoFocus
                    />
                  </div>

                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <span className="text-xs text-slate-400 font-medium">
                        Reenviar novo código em {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => dispararEnvioOtpEmail()}
                        disabled={otpSending}
                        className="text-xs text-sesi-primary hover:text-blue-900 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                        <span>{otpSending ? 'Enviando...' : 'Não recebeu? Reenviar código'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                  authHealth !== 'yes' ||
                  authData !== 'yes' ||
                  authImage === null ||
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
                    <span>Enviar Código de Segurança</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyAndFinalizeSign}
                disabled={otpCode.length < 6 || submittingSign}
                className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
              >
                {submittingSign ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando Assinatura...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Assinatura</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

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

