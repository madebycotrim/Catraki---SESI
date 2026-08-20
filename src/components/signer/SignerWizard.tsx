import React, { useState, useEffect } from 'react';
import { Step1Reading } from './Step1Reading.tsx';
import { Step2FormData } from './Step2FormData.tsx';
import { Step3OtpAndSignature } from './Step3OtpAndSignature.tsx';
import { Step4Success } from './Step4Success.tsx';
import { apiClient } from '../../lib/api.ts';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { SignerRelationship } from '../../lib/types.ts';

interface SignerWizardProps {
  initialToken?: string;
  onNavigateToValidator: (hash: string) => void;
  onNavigateToRevoke: (token: string) => void;
}

export const SignerWizard: React.FC<SignerWizardProps> = ({
  initialToken = 'demo-token-sesi-audiometria-2026',
  onNavigateToValidator,
  onNavigateToRevoke,
}) => {
  const [token] = useState(initialToken);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Dados coletados nas etapas
  const [formData, setFormData] = useState<any>(null);

  const [signResult, setSignResult] = useState<any>(null);

  useEffect(() => {
    loadDocument(token);
  }, [token]);

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
    <div className="w-full space-y-8">
      {/* Barra de Progresso das Etapas (Stepper Corporativo) */}
      <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          
          {/* Etapa 1 */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${
              step >= 1 ? 'bg-sesi-primary text-white ring-4 ring-white' : 'bg-slate-100 text-slate-400'
            }`}>
              1
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 transition-colors ${
              step >= 1 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Leitura
            </span>
            {/* Linha conectora */}
            <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
              step >= 2 ? 'bg-sesi-primary' : 'bg-slate-100'
            }`}></div>
          </div>

          {/* Etapa 2 */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${
              step >= 2 ? 'bg-sesi-primary text-white ring-4 ring-white' : 'bg-slate-100 text-slate-400'
            }`}>
              2
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 transition-colors ${
              step >= 2 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Dados
            </span>
            <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
              step >= 3 ? 'bg-sesi-primary' : 'bg-slate-100'
            }`}></div>
          </div>

          {/* Etapa 3 */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${
              step >= 3 ? 'bg-sesi-primary text-white ring-4 ring-white' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 transition-colors ${
              step >= 3 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Assinatura
            </span>
            <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
              step >= 4 ? 'bg-sesi-green' : 'bg-slate-100'
            }`}></div>
          </div>

          {/* Etapa 4 */}
          <div className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${
              step === 4 ? 'bg-sesi-green text-white ring-4 ring-white' : 'bg-slate-100 text-slate-400'
            }`}>
              4
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 transition-colors ${
              step === 4 ? 'text-sesi-green' : 'text-slate-400'
            }`}>
              Sucesso
            </span>
          </div>

        </div>
      </div>

      {/* Renderização Condicional da Etapa Atual */}
      {step === 1 && (
        <Step1Reading
          document={documentData}
          onProceed={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2FormData
          initialData={formData}
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
          procedureTitle={documentData.procedure_title}
          identityData={{
            signerName: formData.signerName,
            signerCpf: formData.signerCpf,
            signerRelationship: formData.signerRelationship,
            identityMethod: 'manual_review'
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
          minorName={formData.minorName}
          procedureTitle={documentData.procedure_title}
          onNavigateToValidator={onNavigateToValidator}
          onNavigateToRevoke={() => onNavigateToRevoke(token)}
        />
      )}
    </div>
  );
};
