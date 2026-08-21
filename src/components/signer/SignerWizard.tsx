import React, { useState, useEffect } from 'react';
import { Step1Reading } from './Step1Reading.tsx';
import { Step2FormData } from './Step2FormData.tsx';
import { Step3OtpAndSignature } from './Step3OtpAndSignature.tsx';
import { Step4Success } from './Step4Success.tsx';
import { apiClient } from '../../lib/api.ts';
import { Loader2, AlertTriangle } from 'lucide-react';


import type { Institution } from '../../lib/types.ts';

interface SignerWizardProps {
  initialToken?: string;
  schoolSlug?: string;
  onNavigateToValidator: (hash: string) => void;
  onNavigateToRevoke: (token: string) => void;
}

export const SignerWizard: React.FC<SignerWizardProps> = ({
  initialToken = 'demo-token-sesi-audiometria-2026',
  schoolSlug = 'cemeit',
  onNavigateToValidator,
  onNavigateToRevoke,
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
        setErrorMessage(resp.error || 'Documento não localizado ou link expirado.');
      }
    } catch {
      setErrorMessage('Falha ao carregar o termo de autorização médica.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sesi-primary" />
        <span className="text-sm">Carregando autorização escolar segura...</span>
      </div>
    );
  }

  if (errorMessage || !documentData) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl p-8 text-center border border-red-200 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Não foi possível acessar a autorização</h2>
          <p className="text-sm text-slate-500">{errorMessage}</p>
        </div>
      </div>
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
        />
      )}

      {step === 3 && formData && (
        <Step3OtpAndSignature
          token={token}
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
          signerEmail={formData.signerEmail}
          minorName={formData.minorName}
          procedureTitle={documentData.procedure_title}
          onNavigateToValidator={onNavigateToValidator}
          onNavigateToRevoke={() => onNavigateToRevoke(token)}
        />
      )}
    </div>
  );
};
