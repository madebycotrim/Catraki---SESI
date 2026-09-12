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
  onChangeSchool?: () => void;
}

export const SignerWizard: React.FC<SignerWizardProps> = ({
  initialToken = '',
  schoolSlug = '',
  onNavigateToValidator,
  onChangeSchool,
}) => {
  const activeToken = schoolSlug || initialToken;
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Dados coletados nas etapas
  const [formData, setFormData] = useState<any>(null);
  const [signResult, setSignResult] = useState<any>(null);

  useEffect(() => {
    if (activeToken) {
      loadDocument(activeToken);
    }
  }, [activeToken, schoolSlug]);

  const loadDocument = async (t: string) => {
    setLoading(true);
    setErrorMessage('');
    setErrorCode('');
    try {
      // 1. Busca os dados oficiais da instituição pelo slug da URL (prioridade absoluta)
      const targetSlug = schoolSlug || (!t.startsWith('DOC-') && !t.startsWith('SESI-') ? t : '');
      let instResData: Institution | null = null;
      
      if (targetSlug) {
        const instRes = await apiClient.getInstitutionBySlug(targetSlug);
        if (!instRes.success || !instRes.institution) {
          setErrorCode('SCHOOL_NOT_FOUND');
          setErrorMessage(
            (instRes as any)?.error ||
            `A unidade escolar "${targetSlug}" não foi encontrada no sistema. O formulário só pode ser aberto para escolas previamente cadastradas.`
          );
          setLoading(false);
          return;
        }
        instResData = instRes.institution;
      }

      // 2. Busca os dados do documento / template
      const resp = await apiClient.getSignerDoc(t);
      if (resp.success && resp.document) {
        setDocumentData(resp.document);

        const finalName = instResData?.name || resp.document.institution_name;
        const finalShort = instResData?.short_name || resp.document.institution_short_name;
        const finalId = instResData?.id || resp.document.institution_id || targetSlug || 'escola';
        const finalCity = instResData?.city || resp.document.institution_city || 'Brasília';
        const finalState = instResData?.state || resp.document.institution_state || 'DF';

        setInstitution({
          id: finalId,
          name: finalName || 'Escola Participante',
          short_name: finalShort || 'Escola',
          city: finalCity,
          state: finalState,
          is_active: true,
        });
      } else {
        setErrorCode(resp.code || '');
        setErrorMessage(resp.error || 'Este documento não foi encontrado ou o link expirou. Por favor, verifique se você está usando o link mais recente enviado pela escola.');
      }
    } catch {
      setErrorMessage('Não foi possível carregar o documento de autorização. Por favor, verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Ausência de slug na URL: exige link com a escola
  if (!schoolSlug && !initialToken) {
    return (
      <StatusAlertScreen
        scenario="missing_school_slug"
        customReason="Nenhuma escola foi especificada na URL. O formulário de autorização eletrônica só pode ser aberto através do link oficial de uma escola cadastrada (ex: /autorizar/nome-da-escola)."
        onPrimaryAction={onChangeSchool || (() => { window.location.href = '/'; })}
        primaryActionLabel="Ver escolas participantes"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#004b8d]" />
        <span className="text-sm">Carregando autorização escolar segura...</span>
      </div>
    );
  }

  // Escola não cadastrada no sistema
  if (errorCode === 'SCHOOL_NOT_FOUND' || (errorMessage && errorMessage.toLowerCase().includes('não foi encontrada'))) {
    return (
      <StatusAlertScreen
        scenario="school_not_found"
        customReason={errorMessage || `A unidade escolar "${schoolSlug}" não foi encontrada no sistema. O formulário só pode ser aberto para escolas previamente cadastradas.`}
        onPrimaryAction={onChangeSchool || (() => { window.location.href = '/'; })}
        primaryActionLabel="Ver escolas participantes"
      />
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
          } else if (onChangeSchool) {
            onChangeSchool();
          } else {
            window.location.href = schoolSlug ? `/autorizar/${schoolSlug}` : '/';
          }
        }}
        primaryActionLabel={documentData.content_sha256 ? 'Validar assinatura' : 'Voltar ao início'}
      />
    );
  }

  // Cenário 5: Link Expirado (TTL de 3 dias — LGPD e Segurança)
  if (errorCode === 'TOKEN_LINK_EXPIRED' || (errorMessage && errorMessage.toLowerCase().includes('expirou'))) {
    return (
      <StatusAlertScreen
        scenario="link_expired"
        customReason={errorMessage}
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

  // Cenário 1: Documento cancelado ou link indisponível
  if (errorMessage || !documentData || documentData.status === 'cancelado_por_erro' || documentData.status === 'revogado') {
    return (
      <StatusAlertScreen
        scenario="cancelled_link"
        customReason={documentData?.cancellation_reason || errorMessage}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
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
          institutionName={institution?.name || documentData?.institution_name || 'Escola Participante'}
          identityData={{
            signerName: formData.signerName,
            signerCpf: formData.signerCpf,
            signerEmail: formData.signerEmail || 'responsavel@email.com',
            signerPhone: formData.signerPhone,
            signerRelationship: formData.signerRelationship,
            identityMethod: 'declaracao_responsavel',
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
