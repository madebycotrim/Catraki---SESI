import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Mail,
  CheckCircle2,
  RefreshCw,
  X,
  Lock,
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
  const [showOtpModal, setShowOtpModal] = useState(false);
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
        setResendCooldown(60);
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
    setShowOtpModal(true);
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
        setShowOtpModal(false);
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
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              className="h-7 sm:h-9 w-auto object-contain"
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

          {/* 2. PAINEL DE AUTORIZAÇÕES DIGITAIS */}
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                2. PAINEL DE AUTORIZAÇÕES DIGITAIS (Seleção Obrigatória)
              </h2>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium leading-relaxed">
                A Lei Geral de Proteção de Dados (LGPD) exige que seu consentimento seja livre e específico. Selecione suas opções abaixo:
              </p>
            </div>

            {/* A. Atendimento de Saúde */}
            <div className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                A. SOBRE O ATENDIMENTO DE SAÚDE (Obrigatório para participação)
              </h3>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> a realização do atendimento de saúde, triagem e avaliação no(a) estudante sem a minha presença física. Comprometo-me a orientar o(a) menor a portar seu documento de identidade com CPF.
                  </span>
                </label>

                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> o atendimento de saúde. (Impede a participação).
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
                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> a coleta, armazenamento e tratamento de dados pessoais e sensíveis (saúde) do(a) estudante, nos termos do Art. 14 da LGPD, ciente de que serão mantidos em ambiente digital seguro para fins médicos e institucionais.
                  </span>
                </label>

                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> o tratamento de dados. (Impede a participação).
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
                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">AUTORIZO</strong> de forma gratuita o uso da imagem/voz do(a) estudante em fotos e vídeos do evento, pela coordenação do projeto, exclusivamente para registros institucionais e redes sociais oficiais, respeitando a dignidade do menor (ECA e LGPD).
                  </span>
                </label>

                <label className="flex items-start gap-3 p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer select-none group transition-all">
                  <div className="relative mt-0.5 w-5 h-5 min-w-[20px] min-h-[20px] sm:w-4 sm:h-4 sm:min-w-[16px] sm:min-h-[16px] border border-slate-700 bg-white rounded flex items-center justify-center group-hover:border-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <input
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
                    <strong className="text-slate-950 font-bold">NÃO AUTORIZO</strong> o uso da imagem. (O estudante participará normalmente do atendimento e não será fotografado).
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
            <div className="space-y-1.5 text-slate-600 text-xs sm:text-sm leading-relaxed">
              <p className="m-0">
                <strong>Finalidade e Proteção:</strong> Os dados coletados não serão comercializados, repassados a terceiros alheios ao projeto ou utilizados para fins discriminatórios.
              </p>
              <p className="m-0">
                <strong>Direito de Revogação:</strong> O titular, representado por seu responsável, poderá solicitar o acesso aos dados, correções ou a revogação do uso da imagem a qualquer momento através do contato com a direção da escola ou coordenação do projeto.
              </p>
            </div>
          </div>

          {/* 4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA (Declaração Legal)
            </h2>
            <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
              <p className="m-0">
                Declaro, sob as penas da lei (Art. 299 do Código Penal - Falsidade Ideológica), que sou o(a) legítimo(a) responsável legal do(a) menor qualificado(a) e que as informações por mim inseridas nesta plataforma são verdadeiras.
              </p>
              <p className="m-0">
                Reconheço que o aceite eletrônico neste sistema possui validade jurídica, nos termos do Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. Estou ciente de que a plataforma registrará os seguintes dados para fins de comprovação da minha manifestação: Endereço IP do dispositivo utilizado, data e horário do registro, dados do navegador e dispositivo utilizado.
              </p>
            </div>
          </div>

          {/* Checkbox Obrigatório */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 sm:p-3 border-2 border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 cursor-pointer select-none transition-colors">
              <input
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

          {/* 5. Quadro de Assinatura Eletrônica */}
          <div className="pt-4 sm:pt-6 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 m-0">
                5. Assinatura Eletrônica
              </h3>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                MP nº 2.200-2/2001 e Lei nº 14.063/2020
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
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Documento de Identificação</span>
                  <strong className="text-slate-800 font-mono text-xs sm:text-sm block mt-0.5">CPF: {identityData.signerCpf}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Vínculo com o Estudante</span>
                  <span className="text-slate-700 font-medium block mt-0.5">{identityData.signerRelationship}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Confirmação de Segurança</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Código de Confirmação por E-mail
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                Ao clicar em <strong>"Enviar Código por E-mail e Assinar"</strong>, um código de segurança temporário de 6 dígitos será enviado ao seu e-mail para confirmar a sua identidade. O documento registrará a data, o horário e os dados do signatário para fins de comprovação legal.
              </div>
            </div>
          </div>

          {/* Botoes de acoes no A4 */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              type="button"
              onClick={handleInitiateSign}
              disabled={
                authHealth !== 'yes' ||
                authData !== 'yes' ||
                authImage === null ||
                !readAndAccept ||
                submittingSign
              }
              className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer"
            >
              {submittingSign ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Enviar Código por E-mail e Assinar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Barra institucional no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
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

      {/* ─── MODAL DE VERIFICAÇÃO DE CÓDIGO POR E-MAIL (FOLHA A5) ─── */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          
          {/* Folha A5 Responsiva */}
          <div className="document-sheet-a5 max-w-[480px] my-auto animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
            {/* Botão de Fechar discreto */}
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho oficial A5 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-[#034b7f]">
              <img
                src="/logo-1linha.svg"
                alt="SESI Saúde"
                className="h-7 sm:h-8 w-auto object-contain"
              />
              <div className="text-left sm:text-right">
                <p className="text-[9px] sm:text-[7.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
                  Escola Cidadã — Saúde em Movimento
                </p>
                <p className="text-xs sm:text-[8pt] text-slate-800 m-0 font-bold">
                  Validação de Identidade
                </p>
                <p className="text-[9px] sm:text-[7pt] text-slate-500 m-0">
                  {dataHoje}
                </p>
              </div>
            </div>

            {/* Título da Folha A5 */}
            <div className="text-center mb-4">
              <h1 className="text-xs sm:text-sm md:text-[11pt] font-bold uppercase text-slate-900 m-0 tracking-tight">
                CONFIRMAÇÃO DE IDENTIDADE DO SIGNATÁRIO
              </h1>
              <h2 className="text-[11px] sm:text-xs font-bold text-slate-600 mt-1 m-0">
                Validação de Autoria por Código de Segurança Eletrônico
              </h2>
            </div>

            {/* Corpo do Documento A5 */}
            <div className="space-y-3.5 text-xs sm:text-sm">
              <p className="text-slate-700 text-left sm:text-justify m-0 leading-relaxed text-xs sm:text-sm">
                Para autenticar a assinatura do Termo de Consentimento referente ao(à) estudante <strong>{minorName}</strong>, enviamos um código de segurança de 6 dígitos para o e-mail:
              </p>

              <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-2.5 text-center">
                <span className="font-mono font-bold text-sesi-primary text-xs sm:text-sm tracking-wide select-all break-all">
                  {identityData.signerEmail || 'seu e-mail informado'}
                </span>
              </div>

              {/* Mensagem de Erro do OTP */}
              {otpError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="font-semibold">{otpError}</span>
                </div>
              )}

              {/* Campo do Código OTP */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                  Insira o Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center tracking-[0.4em] sm:tracking-[0.5em] text-2xl font-mono font-extrabold py-3 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-sesi-primary focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-slate-900"
                />
              </div>

              {/* Reenvio de Código */}
              <div className="text-center pt-1">
                {resendCooldown > 0 ? (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Reenviar novo código em {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={dispararEnvioOtpEmail}
                    disabled={otpSending}
                    className="text-xs text-sesi-primary hover:text-blue-900 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                    <span>{otpSending ? 'Enviando...' : 'Não recebeu? Reenviar código'}</span>
                  </button>
                )}
              </div>

              {/* Botões de Ação na Folha A5 */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleVerifyAndFinalizeSign}
                  disabled={otpCode.length < 6 || submittingSign}
                  className="w-full py-3 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {submittingSign ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirmando Assinatura...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Concluir Assinatura</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer text-center"
                >
                  Cancelar e Voltar ao Termo
                </button>
              </div>
            </div>

            {/* Barra institucional no final da folha A5 */}
            <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
              <img
                src="/barra.jpg"
                alt="Barra institucional SESI"
                className="w-full h-4 sm:h-5 object-cover object-center block"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

