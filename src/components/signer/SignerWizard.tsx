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

  // Sempre que a etapa mudar, reposiciona a tela no topo (fundamental em dispositivos móveis)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
    const validatorRef = documentData.validation_code || documentData.manifest_sha256 || documentData.content_sha256;
    return (
      <StatusAlertScreen
        scenario="already_signed"
        documentTitle={documentData.procedure_title || documentData.title || 'Termo de Consentimento - Saúde em Movimento'}
        downloadUrl={documentData.pdf_url || `/validar/${validatorRef || documentData.id}`}
        onPrimaryAction={() => {
          if (validatorRef) {
            onNavigateToValidator(validatorRef);
          } else if (onChangeSchool) {
            onChangeSchool();
          } else {
            window.location.href = schoolSlug ? `/autorizar/${schoolSlug}` : '/';
          }
        }}
        primaryActionLabel={validatorRef ? 'Validar assinatura' : 'Voltar ao início'}
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
  if (
    errorMessage ||
    !documentData ||
    ['CANCELADO_POR_ERRO', 'cancelled_error', 'revoked', 'cancelado_por_erro', 'revogado'].includes(documentData.status)
  ) {
    return (
      <StatusAlertScreen
        scenario="cancelled_link"
        customReason={documentData?.cancellation_reason || errorMessage}
      />
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Indicador de Progresso Editorial — Alinhado ao Padrão Folha A4 */}
      <nav aria-label="Etapas da autorização" className="max-w-4xl mx-auto px-1 sm:px-4 no-print">
        <div className="bg-white border border-slate-200/90 border-t-[3px] border-t-[#034b7f] shadow-xs px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <ol className="flex-1 grid grid-cols-4 items-center gap-1 sm:gap-2">
              {[
                { num: 1, label: 'Boas-vindas' },
                { num: 2, label: 'Dados' },
                { num: 3, label: 'Assinatura' },
                { num: 4, label: 'Comprovante' },
              ].map((item, idx) => {
                const isCurrent = step === item.num;
                const isDone = step > item.num;
                return (
                  <li key={item.num} className="relative flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                    {/* Linha conectora editorial entre etapas */}
                    {idx > 0 && (
                      <span
                        aria-hidden="true"
                        className={`hidden sm:block w-4 md:w-7 h-[1.5px] shrink-0 transition-colors ${
                          isDone || isCurrent ? 'bg-[#034b7f]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <span
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold font-mono shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-[#034b7f] text-white ring-2 ring-[#034b7f]/20'
                          : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}
                    >
                      {isDone ? '✓' : item.num}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs tracking-tight truncate ${
                        isCurrent
                          ? 'font-extrabold text-[#034b7f]'
                          : isDone
                            ? 'font-semibold text-emerald-800'
                            : 'font-medium text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <span className="hidden md:inline-block text-[10px] font-mono uppercase tracking-wider text-slate-400 pl-3 border-l border-slate-200 shrink-0">
              Folha {step}/4
            </span>
          </div>
        </div>
      </nav>

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
          token={documentData.access_token || documentData.id}
          minorName={formData.minorName}
          minorBirthDate={formData.minorBirthDate}
          procedureTitle={documentData.procedure_title}
          institutionName={institution?.name || documentData?.institution_name || 'Escola Participante'}
          institutionId={institution?.id || documentData?.institution_id || schoolSlug}
          schoolSlug={schoolSlug || institution?.id || documentData?.institution_id}
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
            guardianshipReference: formData.guardianshipReference,
          }}
          onSuccess={(result) => {
            if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
              try {
                const draftKey = `catraki_form_draft_${institution?.id || 'default'}`;
                sessionStorage.removeItem(draftKey);
              } catch {
                // Ignora falha ao limpar rascunho
              }
            }
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
