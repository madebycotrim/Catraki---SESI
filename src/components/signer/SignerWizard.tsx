import React, { useState, useEffect } from 'react';
import { Step1Reading } from './Step1Reading.tsx';
import { Step2FormData } from './Step2FormData.tsx';
import { Step3OtpAndSignature } from './Step3OtpAndSignature.tsx';
import { Step4Success } from './Step4Success.tsx';
import { StatusAlertScreen } from '../common/StatusAlertScreen.tsx';
import { apiClient } from '../../lib/api.ts';
import { Loader2 } from 'lucide-react';


import type { Institution } from '../../lib/types.ts';

interface SignerWizardProps {
  initialToken?: string;
  schoolSlug?: string;
  onNavigateToValidator: (hash: string) => void;
}

export const SignerWizard: React.FC<SignerWizardProps> = ({
  initialToken = 'demo-token-sesi-audiometria-2026',
  schoolSlug = 'cemeit',
  onNavigateToValidator,
}) => {
  const [token] = useState(initialToken);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Dados coletados nas etapas
  const [formData, setFormData] = useState<any>(null);

  const [signResult, setSignResult] = useState<any>(null);

  useEffect(() => {
    loadDocument(token);
    apiClient.getInstitutionBySlug(schoolSlug || 'cemeit').then((res) => {
      if (res.success && res.institution) {
        setInstitution(res.institution);
      }
    });
  }, [token, schoolSlug]);

  const loadDocument = async (t: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const resp = await apiClient.getSignerDoc(t);
      if (resp.success && resp.document) {
        setDocumentData(resp.document);
      } else {
        setErrorMessage(resp.error || 'Este documento não foi encontrado ou o link expirou. Por favor, verifique se você está usando o link mais recente enviado pela escola.');
      }
    } catch {
      setErrorMessage('Não foi possível carregar o documento de autorização. Por favor, verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#004b8d]" />
        <span className="text-sm">Carregando autorização escolar segura...</span>
      </div>
    );
  }

  // Cenário 3: O documento já foi assinado
  if (documentData && (documentData.status === 'signed' || documentData.status === 'concluido' || documentData.already_signed)) {
    return (
      <StatusAlertScreen
        scenario="already_signed"
        documentTitle={documentData.procedure_title || documentData.title || 'Termo de Consentimento - Saúde em Movimento'}
        downloadUrl={documentData.pdf_url || `/validar/${documentData.content_sha256 || documentData.id}`}
        onPrimaryAction={() => {
          if (documentData.content_sha256) {
            onNavigateToValidator(documentData.content_sha256);
          } else {
            window.location.href = '/autorizar/cemeit';
          }
        }}
        primaryActionLabel={documentData.content_sha256 ? 'Validar assinatura' : 'Fechar tela'}
      />
    );
  }

  // Cenário 2: Erro de segurança ou autenticidade/hash
  if (errorMessage && (errorMessage.toLowerCase().includes('segurança') || errorMessage.toLowerCase().includes('hash') || errorMessage.toLowerCase().includes('adulterado'))) {
    return (
      <StatusAlertScreen
        scenario="security_tampered"
        customReason={errorMessage}
      />
    );
  }

  // Cenário 1: Documento cancelado, expirado ou link indisponível
  if (errorMessage || !documentData || documentData.status === 'cancelado_por_erro' || documentData.status === 'revogado') {
    return (
      <StatusAlertScreen
        scenario="cancelled_link"
        customReason={documentData?.cancellation_reason || errorMessage}
      />
    );
  }

  return (
    <div className="w-full space-y-10">


      {/* Renderização Condicional da Etapa Atual */}
      {step === 1 && (
        <Step1Reading
          document={documentData}
          institution={institution}
          onProceed={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2FormData
          initialData={formData}
          institution={institution}
          onProceed={(data) => {
            setFormData(data);
            setStep(3);
          }}
          onBack={() => setStep(1)}
          onNavigateToValidator={onNavigateToValidator}
        />
      )}

      {step === 3 && formData && (
        <Step3OtpAndSignature
          token={documentData.id}
          minorName={formData.minorName}
          minorBirthDate={formData.minorBirthDate}
          procedureTitle={documentData.procedure_title}
          institutionName={institution?.name}
          identityData={{
            signerName: formData.signerName,
            signerCpf: formData.signerCpf,
            signerEmail: formData.signerEmail || 'responsavel@email.com',
            signerPhone: formData.signerPhone,
            signerRelationship: formData.signerRelationship,
            identityMethod: 'manual_review',
            minorCpf: formData.minorCpf,
            minorSeries: formData.minorSeries,
            minorClass: formData.minorClass,
            minorTurn: formData.minorTurn,
          }}
          onSuccess={(result) => {
            setSignResult(result);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && signResult && formData && (
        <Step4Success
          signResult={signResult}
          signerName={formData.signerName}
          signerRelationship={formData.signerRelationship}
          signerEmail={formData.signerEmail}
          minorName={formData.minorName}
          procedureTitle={documentData.procedure_title}
          onNavigateToValidator={onNavigateToValidator}
        />
      )}
    </div>
  );
};
