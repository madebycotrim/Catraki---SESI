import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api.ts';

interface UseOtpVerificationParams {
  token: string;
  signerEmail?: string;
  minorName?: string;
  signerPhone?: string;
  schoolSlug?: string;
  institutionName?: string;
}

/**
 * Hook customizado para encapsular a máquina de estados do OTP (código de segurança de 6 dígitos).
 * Princípio SOLID: Separação de conceitos de lógica de negócio e temporização da camada visual.
 */
export function useOtpVerification({
  token,
  signerEmail,
  minorName,
  signerPhone,
  schoolSlug,
  institutionName,
}: UseOtpVerificationParams) {
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [signaturePngBase64, setSignaturePngBase64] = useState('');

  // Temporizador para controle de cooldown de reenvio (60s)
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
   * Dispara o envio do código OTP de 6 dígitos por e-mail para o responsável legal
   */
  const requestOtpEmail = useCallback(async () => {
    setOtpSending(true);
    setOtpError('');
    setSimulatedOtp('');

    try {
      const resp = await apiClient.requestOtp(
        token,
        'email',
        signerEmail || undefined,
        minorName || undefined,
        undefined,
        signerPhone || undefined,
        schoolSlug || undefined,
        institutionName || undefined
      );

      if (resp.success) {
        if (resp.simulated_otp) {
          setSimulatedOtp(resp.simulated_otp);
        }
        if (resp.email_sent === false && resp.email_error) {
          if (resp.simulated_otp) {
            setResendCooldown(60);
          } else {
            setOtpError(`Falha no envio do código: ${resp.email_error}`);
          }
        } else {
          setResendCooldown(60);
        }
      } else {
        setOtpError(
          resp.error || 'Não foi possível enviar o código de segurança. Tente novamente.'
        );
      }
    } catch {
      setOtpError(
        'Não foi possível enviar o código de segurança no momento. Por favor, aguarde alguns instantes e tente novamente. Se o problema persistir, verifique sua conexão com a internet.'
      );
    } finally {
      setOtpSending(false);
    }
  }, [token, signerEmail, minorName, signerPhone]);

  return {
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
  };
}
