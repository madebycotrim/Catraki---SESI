import React, { useState } from 'react';
import { UserCheck, ShieldAlert, CheckCircle2, UploadCloud, ArrowRight, Loader2, AlertTriangle, ShieldCheck, ChevronLeft } from 'lucide-react';
import { isValidCPF } from '../../lib/schemas.ts';
import { apiClient } from '../../lib/api.ts';
import type { SignerRelationship } from '../../lib/types.ts';

interface Step2IdentityProps {
  token: string;
  minorName: string;
  onVerified: (identityData: {
    signerName: string;
    signerCpf: string;
    signerRelationship: SignerRelationship;
    identityMethod: 'matricula_sesi' | 'manual_review';
  }) => void;
  onBack: () => void;
}

export const Step2Identity: React.FC<Step2IdentityProps> = ({ token, minorName, onVerified, onBack }) => {
  const [signerName, setSignerName] = useState('');
  const [signerCpfRaw, setSignerCpfRaw] = useState('');
  const [relationship, setRelationship] = useState<SignerRelationship>('Pai');
  
  const [checkingMatricula, setCheckingMatricula] = useState(false);
  const [matriculaResult, setMatriculaResult] = useState<{
    verified: boolean;
    checked: boolean;
    message: string;
    guardianType?: string;
  } | null>(null);

  // Estados para Upload de Revisão Manual
  const [idDocBase64, setIdDocBase64] = useState<string>('');
  const [selfieBase64, setSelfieBase64] = useState<string>('');
  const [guardianshipBase64, setGuardianshipBase64] = useState<string>('');
  const [uploadingReview, setUploadingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewProtocol, setReviewProtocol] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isCpfValid = isValidCPF(signerCpfRaw);

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setSignerCpfRaw(digits);
    setMatriculaResult(null);
    setErrorMessage('');
  };

  const handleVerifyMatricula = async () => {
    if (!isCpfValid || !signerName.trim()) {
      setErrorMessage('Preencha seu nome completo e um CPF válido para consulta.');
      return;
    }

    setCheckingMatricula(true);
    setErrorMessage('');

    try {
      const resp = await apiClient.verifyMatricula({
        token,
        signer_cpf: signerCpfRaw,
        signer_name: signerName,
        signer_relationship: relationship,
      });

      if (resp.success) {
        setMatriculaResult({
          verified: resp.hasValidEnrollment,
          checked: true,
          message: resp.message,
          guardianType: resp.guardianType,
        });
      } else {
        setErrorMessage(resp.error || 'Erro ao consultar base de matrícula.');
      }
    } catch {
      setErrorMessage('Falha na comunicação com o serviço de validação.');
    } finally {
      setCheckingMatricula(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite máximo permitido de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitManualReview = async () => {
    if (!idDocBase64 || !selfieBase64) {
      setErrorMessage('É obrigatório anexar a foto do documento de identidade e a selfie com documento.');
      return;
    }

    if ((relationship === 'Tutor Legal' || relationship === 'Responsável por Guarda Judicial') && !guardianshipBase64) {
      setErrorMessage('Para tutor legal ou guarda judicial, é obrigatório o anexo do termo de tutela/guarda.');
      return;
    }

    setUploadingReview(true);
    setErrorMessage('');

    try {
      const resp = await apiClient.submitManualReview({
        token,
        signer_name: signerName,
        signer_cpf: signerCpfRaw,
        signer_relationship: relationship,
        identity_doc_base64: idDocBase64,
        selfie_base64: selfieBase64,
        guardianship_doc_base64: guardianshipBase64 || undefined,
        notes: `Solicitação de vínculo de ${relationship} para o menor ${minorName}`,
      });

      if (resp.success) {
        setReviewSubmitted(true);
        setReviewProtocol(resp.reviewId);
      } else {
        setErrorMessage(resp.error || 'Erro ao enviar documentos para análise.');
      }
    } catch {
      setErrorMessage('Falha ao enviar documentos.');
    } finally {
      setUploadingReview(false);
    }
  };

  const handleProceedToOtp = () => {
    onVerified({
      signerName,
      signerCpf: signerCpfRaw,
      signerRelationship: relationship,
      identityMethod: matriculaResult?.verified ? 'matricula_sesi' : 'manual_review',
    });
  };

  return (
    <div className="space-y-6">
      {/* Informação da Etapa */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-sesi-green">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-sesi-green">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Identificação e Vínculo de Representação Legal</h2>
            <p className="text-xs text-slate-500">
              Conforme as diretrizes escolares e o Art. 14 da LGPD, a autorização escolar exige comprovação do poder familiar.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário de Identificação do Responsável */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="identity-signer-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome Completo do Responsável Legal:
            </label>
            <input
              id="identity-signer-name"
              name="identitySignerName"
              type="text"
              value={signerName}
              onChange={(e) => {
                setSignerName(e.target.value);
                setMatriculaResult(null);
              }}
              placeholder="Digite seu nome completo civil"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="identity-signer-cpf" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>CPF do Responsável:</span>
              {signerCpfRaw && (
                <span className={`text-[11px] ${isCpfValid ? 'text-sesi-green font-medium' : 'text-red-500'}`}>
                  {isCpfValid ? '✓ CPF Válido' : '✗ CPF Inválido'}
                </span>
              )}
            </label>
            <input
              id="identity-signer-cpf"
              name="identitySignerCpf"
              type="text"
              value={formatCpf(signerCpfRaw)}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm font-mono text-slate-800 placeholder-slate-400 outline-none transition-colors ${
                signerCpfRaw && !isCpfValid ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'
              }`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="identity-signer-relationship" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Grau de Parentesco / Representação Legal:
          </label>
          <select
            id="identity-signer-relationship"
            name="identitySignerRelationship"
            value={relationship}
            onChange={(e) => {
              setRelationship(e.target.value as SignerRelationship);
              setMatriculaResult(null);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-colors"
          >
            <option value="Pai">Pai</option>
            <option value="Mãe">Mãe</option>
            <option value="Tutor Legal">Tutor Legal (Exige anexo de documento de tutela)</option>
            <option value="Responsável por Guarda Judicial">Responsável por Guarda Judicial (Exige anexo de guarda)</option>
          </select>
        </div>

        {/* Botão de Verificação Automática contra Matrícula SESI */}
        {(!matriculaResult || !matriculaResult.checked) && (
          <div className="pt-2">
            <button
              onClick={handleVerifyMatricula}
              disabled={checkingMatricula || !isCpfValid || !signerName.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-sesi-primary hover:bg-blue-800 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {checkingMatricula ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando Base de Matrícula SESI Escola...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verificar Vínculo com a Matrícula Escolar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Cenário A: Vínculo Confirmado na Matrícula SESI */}
        {matriculaResult?.verified && (relationship === 'Pai' || relationship === 'Mãe') && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-green-700 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Vínculo Confirmado com Sucesso na Matrícula SESI</span>
            </div>
            <p className="text-green-700 leading-relaxed">
              O CPF informado confere com os registros presenciais de representação legal do aluno <strong>{minorName}</strong> na base acadêmica do SESI Educação.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleProceedToOtp}
                className="px-5 py-2.5 rounded-xl bg-sesi-green hover:bg-green-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <span>Avançar para Autenticação 2FA (OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Cenário B: Sem Vínculo Automático ou Guarda Judicial -> Fila de Revisão Manual */}
        {matriculaResult?.checked && (!matriculaResult.verified || relationship === 'Tutor Legal' || relationship === 'Responsável por Guarda Judicial') && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-700 text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Revisão Manual de Identidade Necessária</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Por se tratar de autorização <strong>escolar de menor</strong>, quando não há vínculo prévio na matrícula SESI ou para tutores/guardiões judiciais, é obrigatório o envio de comprovação documental para análise prévia da equipe pedagógica.
              </p>
            </div>

            {!reviewSubmitted ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Upload de Documentos Comprobatórios (Sem Metadados EXIF)
                </h3>

                {/* Upload RG/CNH */}
                <div>
                  <label htmlFor="upload-id-doc" className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Documento de Identidade com Foto (RG ou CNH do Responsável):
                  </label>
                  <input
                    id="upload-id-doc"
                    name="uploadIdDoc"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => handleFileUpload(e, setIdDocBase64)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sesi-primary file:text-white hover:file:bg-blue-800 cursor-pointer"
                  />
                  {idDocBase64 && (
                    <span className="text-[11px] text-sesi-green mt-1 block">✓ Documento anexado</span>
                  )}
                </div>

                {/* Upload Selfie */}
                <div>
                  <label htmlFor="upload-selfie" className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Selfie Segurando o Documento de Identidade:
                  </label>
                  <input
                    id="upload-selfie"
                    name="uploadSelfie"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => handleFileUpload(e, setSelfieBase64)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sesi-primary file:text-white hover:file:bg-blue-800 cursor-pointer"
                  />
                  {selfieBase64 && (
                    <span className="text-[11px] text-sesi-green mt-1 block">✓ Selfie anexada</span>
                  )}
                </div>

                {/* Upload Guarda / Tutela se aplicável */}
                {(relationship === 'Tutor Legal' || relationship === 'Responsável por Guarda Judicial') && (
                  <div>
                    <label htmlFor="upload-guardianship" className="block text-xs font-semibold text-slate-700 mb-1">
                      3. Certidão de Tutela / Termo de Guarda Judicial:
                    </label>
                    <input
                      id="upload-guardianship"
                      name="uploadGuardianship"
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileUpload(e, setGuardianshipBase64)}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                    />
                    {guardianshipBase64 && (
                      <span className="text-[11px] text-sesi-green mt-1 block">✓ Termo de guarda anexado</span>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSubmitManualReview}
                  disabled={uploadingReview || !idDocBase64 || !selfieBase64}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {uploadingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Higienizando Metadados e Enviando Documentos...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Submeter para Análise Escolar</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sesi-green text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Documentos Recebidos — Análise em Andamento</span>
                </div>
                <p className="text-slate-600">
                  Protocolo de Revisão: <span className="font-mono text-sesi-primary font-bold">{reviewProtocol}</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  A equipe do SESI analisará os documentos enviados e, após aprovação, o link de assinatura será liberado. Em caso de dúvidas, procure a coordenação da escola ou a equipe de apoio presencial do projeto.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegação Inferior */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar à Leitura do Termo</span>
        </button>
      </div>
    </div>
  );
};
