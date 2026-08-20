import React, { useState, useRef } from 'react';
import {
  PenTool,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronLeft,
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
  const [authHealth, setAuthHealth] = useState<'yes' | 'no' | null>(null);
  const [authData, setAuthData] = useState<'yes' | 'no' | null>(null);
  const [authImage, setAuthImage] = useState<'yes' | 'no' | null>(null);
  const [readAndAccept, setReadAndAccept] = useState(false);

  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getCanvasCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    isDrawing.current = true;
    lastPoint.current = coords;
  };

  const draw = (e: any) => {
    if (!isDrawing.current || !canvasRef.current || !lastPoint.current) return;
    e.preventDefault();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoordinates(e);

    ctx.strokeStyle = '#034b7f'; // Cor oficial azul SESI para assinatura
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
      setErrorMessage('Por favor, desenhe a sua assinatura no campo indicado.');
      return;
    }

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

    setSubmittingSign(true);
    setErrorMessage('');

    try {
      const signaturePngBase64 = canvasRef.current.toDataURL('image/png');

      const resp = await apiClient.signDocument({
        token,
        otp_code: 'magic-link',
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
        setErrorMessage(resp.error || 'Falha ao processar a assinatura.');
      }
    } catch {
      setErrorMessage('Erro ao submeter assinatura eletrônica.');
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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 pb-8">


      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3 mb-4 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Mesa / Fundo claro e moderno */}
      <div
        style={{
          background: '#f1f5f9',
          padding: '28px 20px',
          borderRadius: '8px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Folha A4 */}
        <div
          style={{
            background: '#fff',
            paddingTop:    '113px',
            paddingLeft:   '113px',
            paddingRight:  '76px',
            paddingBottom: '100px',
            fontFamily: "'Arial', sans-serif",
            fontSize: '11pt',
            lineHeight: '1.6',
            color: '#000',
            minHeight: '297mm',
            position: 'relative',
            boxShadow: '0 4px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.12)',
          }}
        >
          {/* Cabeçalho oficial */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: '3px solid #034b7f',
          }}>
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              style={{ height: '52px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9pt', color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Escola Cidadã: Saúde em Movimento
              </p>
              <p style={{ fontSize: '9pt', color: '#333', margin: 0, fontWeight: 'bold' }}>
                Termo de Consentimento (TCLE)
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          <div className="space-y-8 text-xs sm:text-sm text-slate-800">

            {/* 2. PAINEL DE AUTORIZAÇÕES DIGITAIS */}
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                  2. PAINEL DE AUTORIZAÇÕES DIGITAIS (Seleção Obrigatória)
                </h2>
                <p className="text-slate-500 mt-1 font-medium leading-relaxed">
                  A Lei Geral de Proteção de Dados (LGPD) exige que seu consentimento seja livre e específico. Selecione suas opções abaixo:
                </p>
              </div>

              {/* A. Atendimento de Saúde */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  A. SOBRE O ATENDIMENTO DE SAÚDE (Obrigatório para participação)
                </h3>
                <div className="space-y-2 pl-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'yes'}
                      onChange={() => setAuthHealth('yes')}
                      className="mt-0.5 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary"
                    />
                    <span>
                      <strong className="text-slate-900">AUTORIZO</strong> a realização do atendimento de saúde, triagem e avaliação no(a) estudante sem a minha presença física. Comprometo-me a orientar o(a) menor a portar seu documento de identidade com CPF.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authHealth"
                      checked={authHealth === 'no'}
                      onChange={() => setAuthHealth('no')}
                      className="mt-0.5 w-4 h-4 text-red-500 border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-red-700 font-semibold">
                      NÃO AUTORIZO o atendimento de saúde. (Impede a participação).
                    </span>
                  </label>
                </div>
              </div>

              {/* B. Dados Pessoais */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  B. SOBRE OS DADOS PESSOAIS E DE SAÚDE (Obrigatório para participação)
                </h3>
                <div className="space-y-2 pl-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authData"
                      checked={authData === 'yes'}
                      onChange={() => setAuthData('yes')}
                      className="mt-0.5 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary"
                    />
                    <span>
                      <strong className="text-slate-900">AUTORIZO</strong> a coleta, armazenamento e tratamento de dados pessoais e sensíveis (saúde) do(a) estudante, nos termos do Art. 14 da LGPD, ciente de que serão mantidos em ambiente digital seguro para fins médicos e institucionais.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authData"
                      checked={authData === 'no'}
                      onChange={() => setAuthData('no')}
                      className="mt-0.5 w-4 h-4 text-red-500 border-slate-300 focus:ring-red-500"
                    />
                    <span className="text-red-700 font-semibold">
                      NÃO AUTORIZO o tratamento de dados. (Impede a participação).
                    </span>
                  </label>
                </div>
              </div>

              {/* C. Uso de Imagem */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  C. SOBRE O USO DE IMAGEM E VOZ (Opcional)
                </h3>
                <div className="space-y-2 pl-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authImage"
                      checked={authImage === 'yes'}
                      onChange={() => setAuthImage('yes')}
                      className="mt-0.5 w-4 h-4 text-sesi-primary border-slate-300 focus:ring-sesi-primary"
                    />
                    <span>
                      <strong className="text-slate-900">AUTORIZO</strong> de forma gratuita, irrevogável e definitiva o uso da imagem/voz do(a) estudante em fotos e vídeos do evento, pela coordenação do projeto, exclusivamente para campanhas institucionais e redes sociais oficiais, respeitando a dignidade do menor (ECA).
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="authImage"
                      checked={authImage === 'no'}
                      onChange={() => setAuthImage('no')}
                      className="mt-0.5 w-4 h-4 text-slate-500 border-slate-300 focus:ring-slate-500"
                    />
                    <span>
                      NÃO AUTORIZO o uso da imagem. (O estudante participará normalmente do atendimento e não será fotografado).
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                3. COMPROMISSOS E DIREITOS DO TITULAR DOS DADOS
              </h2>
              <div className="pl-2 space-y-1 text-slate-600">
                <p>
                  <strong>Finalidade e Proteção:</strong> Os dados coletados não serão comercializados, repassados a terceiros alheios ao projeto ou utilizados para fins discriminatórios.
                </p>
                <p>
                  <strong>Direito de Revogação:</strong> O titular, representado por seu responsável, poderá solicitar o acesso aos dados, correções ou a revogação do uso da imagem a qualquer momento através do contato com a direção da escola ou coordenação do projeto.
                </p>
              </div>
            </div>

            {/* 4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                4. VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA (Cláusula de Validação)
              </h2>
              <div className="pl-2 space-y-2 text-slate-600 leading-relaxed">
                <p>
                  Declaro, sob as penas da lei (Art. 299 do Código Penal - Falsidade Ideológica), que sou o(a) legítimo(a) responsável legal do(a) menor qualificado(a) e que as informações por mim inseridas nesta plataforma são verdadeiras.
                </p>
                <p>
                  Reconheço que o aceite eletrônico neste sistema possui plena validade jurídica e eficácia probatória, nos termos do Art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. Estou ciente de que a plataforma registrará e armazenará, de forma segura, os seguintes dados para fins de comprovação e auditoria da minha assinatura: Endereço IP do dispositivo utilizado; Data e Hora (Timestamp) do registro; Dados do navegador/dispositivo e geolocalização (quando habilitada).
                </p>
              </div>
            </div>

            {/* Checkbox Obrigatório */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 border-2 border-slate-200 rounded bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={readAndAccept}
                  onChange={(e) => setReadAndAccept(e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-sesi-primary focus:ring-sesi-primary border-slate-300 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 leading-normal">
                  DECLARO QUE LI, compreendi integralmente e concordo com todas as disposições deste Termo de Consentimento Livre e Esclarecido Digital.
                </span>
              </label>
            </div>

            {/* Quadro de Assinatura */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Assinatura do Responsável Legal
                </h3>
                {hasDrawnSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-[10px] text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors font-bold"
                  >
                    <RotateCcw className="w-3 h-3" /> Limpar assinatura
                  </button>
                )}
              </div>

              {/* Área do Canvas */}
              <div className="relative rounded bg-slate-50 border-2 border-dashed border-slate-300 overflow-hidden hover:border-slate-400 transition-colors">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[130px] touch-none cursor-crosshair block"
                  aria-label="Assinatura manuscrita"
                />
                {!hasDrawnSignature && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 gap-1.5">
                    <PenTool className="w-6 h-6 text-slate-300 opacity-60 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-70">
                      Assine aqui usando o dedo ou o mouse
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-center bg-slate-50 border border-slate-200 py-2.5 rounded">
                <span className="block font-bold text-xs text-slate-800 uppercase tracking-wide">
                  {identityData.signerName}
                </span>
                <span className="block text-[9px] text-slate-500 mt-0.5 uppercase tracking-widest">
                  Assinante Legal · CPF: {identityData.signerCpf}
                </span>
              </div>
            </div>

            {/* Botoes de acoes no A4 */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinalSign}
                disabled={!hasDrawnSignature || authHealth !== 'yes' || authData !== 'yes' || authImage === null || !readAndAccept || submittingSign}
                className="w-full sm:w-auto px-6 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {submittingSign ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Assinar Eletronicamente e Enviar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─── Barra institucional no final da folha ─── */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />
          </div>

          {/* ─── Número de página (canto superior direito ABNT) ─── */}
          <div style={{
            position: 'absolute',
            top:   '76px',
            right: '76px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            color: '#000',
          }}>
            3
          </div>
        </div>
      </div>
    </div>
  );
};
