import React, { useState, useRef } from 'react';
import {
  PenTool,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { SignerRelationship } from '../../lib/types.ts';

interface Step3OtpAndSignatureProps {
  token: string;
  minorName: string;
  procedureTitle: string;
  identityData: {
    signerName: string;
    signerCpf: string;
    signerRelationship: SignerRelationship;
    identityMethod: 'matricula_sesi' | 'manual_review';
  };
  onSuccess: (signResult: any) => void;
  onBack: () => void;
}

export const Step3OtpAndSignature: React.FC<Step3OtpAndSignatureProps> = ({
  token,
  identityData,
  onSuccess,
  onBack,
}) => {
  // Estados da Assinatura e Checkboxes Legais
  const [authHealth, setAuthHealth] = useState<'yes' | 'no' | null>(null);
  const [authData, setAuthData] = useState<'yes' | 'no' | null>(null);
  const [authImage, setAuthImage] = useState<'yes' | 'no' | null>(null);
  const [readAndAccept, setReadAndAccept] = useState(false);

  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // ==========================================================================
  // FUNÇÕES DO CANVAS DE ASSINATURA RESPONSIVO E TOUCH-FRIENDLY
  // ==========================================================================

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    isDrawing.current = true;
    lastPoint.current = coords;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current || !lastPoint.current) return;
    e.preventDefault();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoordinates(e);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.stroke();

    lastPoint.current = currentCoords;
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawnSignature(false);
  };

  const handleFinalSign = async () => {
    if (!hasDrawnSignature || !canvasRef.current) {
      setErrorMessage('Por favor, desenhe a sua rubrica no campo indicado.');
      return;
    }

    if (authHealth !== 'yes') {
      setErrorMessage('É obrigatório autorizar o atendimento de saúde para prosseguir com a assinatura.');
      return;
    }

    if (authData !== 'yes') {
      setErrorMessage('É obrigatório autorizar o tratamento de dados pessoais para viabilizar o atendimento.');
      return;
    }

    if (authImage === null) {
      setErrorMessage('Por favor, selecione uma opção (Sim ou Não) para o uso de imagem.');
      return;
    }

    if (!readAndAccept) {
      setErrorMessage('É obrigatório declarar que leu e aceita as disposições legais e a responsabilidade penal.');
      return;
    }

    setSubmittingSign(true);
    setErrorMessage('');

    try {
      const signaturePngBase64 = canvasRef.current.toDataURL('image/png');

      const resp = await apiClient.signDocument({
        token,
        otp_code: 'magic-link', // OTP não é mais necessário no fluxo de Link Mágico
        signer_name: identityData.signerName,
        signer_cpf: identityData.signerCpf,
        signer_relationship: identityData.signerRelationship,
        signature_png_base64: signaturePngBase64,
        consent_lgpd_art11_art14: true,
        declaration_art299_penal: true,
        client_fingerprint: `${navigator.language}_${screen.width}x${screen.height}`,
      });

      if (resp.success) {
        onSuccess(resp);
      } else {
        setErrorMessage(resp.error || 'Falha ao processar assinatura.');
      }
    } catch {
      setErrorMessage('Erro ao submeter assinatura eletrônica.');
    } finally {
      setSubmittingSign(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Assinatura Eletrônica</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Validação e coleta de consentimento formal. Revise as opções e assine o documento.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3 max-w-3xl mx-auto shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Papel Digital (Estilo A4 Oficial) */}
      <div className="bg-slate-200/50 p-4 sm:p-8 flex justify-center rounded-xl shadow-inner border border-slate-200">
        <div className="bg-white w-full max-w-3xl shadow-sm border border-slate-300 flex flex-col relative pb-12">
          
          <div className="w-full h-1.5 bg-sesi-primary"></div>

          <div className="p-8 sm:p-14 text-slate-700 text-sm leading-relaxed text-justify space-y-10 font-serif">
            
            <div className="text-center border-b border-slate-200 pb-6 mb-8">
              <h3 className="text-xl font-bold font-sans uppercase tracking-wider text-slate-900">
                Termo de Consentimento e Declaração de Responsabilidade
              </h3>
            </div>

            {/* PAINEL DE AUTORIZAÇÕES DIGITAIS */}
            <div className="space-y-8 font-sans">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-sesi-primary shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 font-medium">
                  A Lei Geral de Proteção de Dados (LGPD) exige que seu consentimento seja livre e específico. Selecione suas opções abaixo com cuidado.
                </p>
              </div>

              {/* A. Atendimento de Saúde */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  A. SOBRE O ATENDIMENTO DE SAÚDE (Obrigatório)
                </h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'yes'}
                      onChange={() => setAuthHealth('yes')}
                      className="mt-1 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-slate-900">AUTORIZO</strong> a realização do atendimento de saúde, triagem e avaliação no(a) estudante sem a minha presença física. Comprometo-me a orientar o(a) menor a portar seu documento de identidade com CPF.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'no'}
                      onChange={() => setAuthHealth('no')}
                      className="mt-1 w-4 h-4 text-red-500 border-slate-300 focus:ring-red-500 bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-red-600">NÃO AUTORIZO</strong> o atendimento de saúde. <em className="text-red-500 text-xs">(Atenção: Impede a participação)</em>.
                    </span>
                  </label>
                </div>
              </div>

              {/* B. Uso de Dados Pessoais */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  B. SOBRE OS DADOS PESSOAIS E DE SAÚDE (Obrigatório)
                </h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authData"
                      checked={authData === 'yes'}
                      onChange={() => setAuthData('yes')}
                      className="mt-1 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-slate-900">AUTORIZO</strong> a coleta, armazenamento e tratamento de dados pessoais e sensíveis (saúde) do(a) estudante, nos termos do Art. 14 da LGPD, ciente de que serão mantidos em ambiente digital seguro para fins médicos e institucionais.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authData"
                      checked={authData === 'no'}
                      onChange={() => setAuthData('no')}
                      className="mt-1 w-4 h-4 text-red-500 border-slate-300 focus:ring-red-500 bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-red-600">NÃO AUTORIZO</strong> o tratamento de dados. <em className="text-red-500 text-xs">(Atenção: Impede a participação)</em>.
                    </span>
                  </label>
                </div>
              </div>

              {/* C. Uso de Imagem e Voz */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                  C. SOBRE O USO DE IMAGEM E VOZ (Opcional)
                </h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authImage"
                      checked={authImage === 'yes'}
                      onChange={() => setAuthImage('yes')}
                      className="mt-1 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-slate-900">AUTORIZO</strong> de forma gratuita, irrevogável e definitiva o uso da imagem/voz do(a) estudante em fotos e vídeos do evento, pela Federação das Indústrias do DF (Fibra) e entidades parceiras, exclusivamente para campanhas institucionais e redes sociais oficiais, respeitando a dignidade do menor (ECA).
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group p-3 border border-transparent hover:bg-slate-50 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="authImage"
                      checked={authImage === 'no'}
                      onChange={() => setAuthImage('no')}
                      className="mt-1 w-4 h-4 text-slate-500 border-slate-300 focus:ring-slate-500 bg-white cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-snug">
                      <strong className="text-slate-600">NÃO AUTORIZO</strong> o uso da imagem. (O estudante participará normalmente do atendimento e não será fotografado).
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-sans">
                  Quadro de Assinatura
                </h4>
                {hasDrawnSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1.5 transition-colors font-sans font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Limpar e Assinar Novamente
                  </button>
                )}
              </div>

              {/* Quadro do Canvas imitando papel pontilhado */}
              <div className="relative rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 overflow-hidden mb-6 hover:border-slate-400 transition-colors">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] touch-none cursor-crosshair block"
                  aria-label="Área para desenho da rubrica com o dedo ou mouse"
                />

                {!hasDrawnSignature && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 gap-3">
                    <PenTool className="w-8 h-8 text-slate-300 opacity-50" />
                    <span className="font-sans text-sm font-semibold uppercase tracking-wider text-slate-400 opacity-60">
                      Assine neste espaço
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center bg-white border border-slate-200 p-4 rounded-lg inline-block w-full">
                <span className="block font-bold text-slate-800 uppercase font-sans tracking-wide">
                  {identityData.signerName}
                </span>
                <span className="block text-xs text-slate-500 font-sans mt-1 uppercase tracking-widest">
                  CPF: {identityData.signerCpf}
                </span>
              </div>
            </div>

            {/* VALIDADE JURÍDICA E ACEITE FINAL */}
            <div className="mt-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden font-sans">
              <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                  Validade Jurídica da Assinatura Eletrônica
                </h4>
              </div>
              <div className="p-6 space-y-4 text-sm text-slate-600">
                <p>
                  Declaro, sob as penas da lei (Art. 299 do Código Penal - Falsidade Ideológica), que sou o(a) legítimo(a) responsável legal do(a) menor acima qualificado(a) e que as informações por mim inseridas nesta plataforma são verdadeiras.
                </p>
                <p>
                  Reconheço que o aceite eletrônico neste sistema possui plena validade jurídica e eficácia probatória, nos termos do Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.
                </p>
                <div className="flex items-start gap-3 bg-white border border-slate-200 p-4 rounded-lg text-xs">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-sesi-primary" />
                  <p className="leading-relaxed">
                    Estou ciente de que a plataforma registrará e armazenará, de forma segura, o Endereço IP do dispositivo utilizado, a Data e Hora (Timestamp) do registro, dados do navegador e um manifesto criptográfico SHA-256 encadeado em trilha de auditoria para fins de comprovação da assinatura.
                  </p>
                </div>
              </div>
            </div>

            {/* Checkbox Master */}
            <label className="flex items-start gap-4 mt-8 p-6 border-2 border-slate-200 rounded-xl bg-white hover:border-sesi-primary transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                checked={readAndAccept}
                onChange={(e) => setReadAndAccept(e.target.checked)}
                className="mt-1 w-6 h-6 rounded text-sesi-primary focus:ring-sesi-primary border-slate-300 cursor-pointer"
              />
              <span className="text-slate-800 font-bold leading-snug pt-1">
                DECLARO QUE LI, compreendi integralmente e concordo com todas as disposições deste Termo de Consentimento Livre e Esclarecido.
              </span>
            </label>

          </div>

          <div className="h-8 bg-gradient-to-t from-white via-white/80 to-transparent w-full absolute bottom-0 left-0 pointer-events-none"></div>
        </div>
      </div>

      {/* Botões de Ação na interface do Wizard */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Voltar para Dados</span>
        </button>

        <button
          onClick={handleFinalSign}
          disabled={!hasDrawnSignature || authHealth !== 'yes' || authData !== 'yes' || authImage === null || !readAndAccept || submittingSign}
          className="w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-sm bg-sesi-primary hover:bg-blue-800 text-white shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-3 transition-all cursor-pointer"
        >
          {submittingSign ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Assinar Eletronicamente</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
