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
    <div className="w-full space-y-10">
      {/* Barra de Progresso das Etapas (Stepper Premium) */}
      <div className="w-full max-w-4xl mx-auto mt-6 mb-8 px-2 sm:px-10">
        <div className="relative flex items-center justify-between">
          
          {/* Linha Base (Cinza) */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 rounded-full -translate-y-6"></div>
          
          {/* Linha Preenchida (Azul SESI) */}
          <div 
            className="absolute top-1/2 left-0 h-1 bg-sesi-primary rounded-full -translate-y-6 transition-all duration-700 ease-in-out"
            style={{ width: `${(Math.max(1, step) - 1) * 33.33}%` }} 
          ></div>

          {/* Etapa 1 */}
          <div className="relative flex flex-col items-center flex-1 z-10 group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-sm ${
              step >= 1 ? 'bg-sesi-primary text-white ring-4 ring-white scale-110 shadow-md' : 'bg-slate-100 text-slate-400 ring-4 ring-white'
            }`}>
              {step > 1 ? (
                <svg className="w-6 h-6 text-white animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '1'}
            </div>
            <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-widest mt-4 transition-colors ${
              step >= 1 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Leitura
            </span>
          </div>

          {/* Etapa 2 */}
          <div className="relative flex flex-col items-center flex-1 z-10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-sm ${
              step >= 2 ? 'bg-sesi-primary text-white ring-4 ring-white scale-110 shadow-md' : 'bg-white border-2 border-slate-200 text-slate-400 ring-4 ring-white'
            }`}>
              {step > 2 ? (
                <svg className="w-6 h-6 text-white animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '2'}
            </div>
            <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-widest mt-4 transition-colors ${
              step >= 2 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Identificação
            </span>
          </div>

          {/* Etapa 3 */}
          <div className="relative flex flex-col items-center flex-1 z-10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-sm ${
              step >= 3 ? 'bg-sesi-primary text-white ring-4 ring-white scale-110 shadow-md' : 'bg-white border-2 border-slate-200 text-slate-400 ring-4 ring-white'
            }`}>
              {step > 3 ? (
                <svg className="w-6 h-6 text-white animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '3'}
            </div>
            <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-widest mt-4 transition-colors ${
              step >= 3 ? 'text-sesi-primary' : 'text-slate-400'
            }`}>
              Assinatura
            </span>
          </div>

          {/* Etapa 4 */}
          <div className="relative flex flex-col items-center flex-1 z-10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-sm ${
              step === 4 ? 'bg-sesi-green text-white ring-4 ring-white scale-110 shadow-md' : 'bg-white border-2 border-slate-200 text-slate-400 ring-4 ring-white'
            }`}>
              {step === 4 ? (
                <svg className="w-6 h-6 text-white animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : '4'}
            </div>
            <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-widest mt-4 transition-colors ${
              step === 4 ? 'text-sesi-green' : 'text-slate-400'
            }`}>
              Comprovante
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
