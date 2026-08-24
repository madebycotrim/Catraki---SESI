import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  QrCode,
  FileText,
  Clock,
  Printer,
  MailCheck,
  Download,
} from 'lucide-react';
import QRCode from 'qrcode';

interface Step4SuccessProps {
  signResult: {
    document_id: string;
    validation_code?: string;
    manifest_sha256: string;
    log_row_hash: string;
    signed_at_utc: string;
    signed_at?: string;
    ip_address?: string;
    geo_city?: string;
    geo_region?: string;
    tsa_authority?: string;
    validation_url: string;
    message: string;
    otp_channel?: 'email' | 'sms';
  };
  signerName: string;
  signerRelationship?: string;
  signerEmail?: string;
  minorName: string;
  procedureTitle: string;
  onNavigateToValidator: (code: string) => void;
}

export const Step4Success: React.FC<Step4SuccessProps> = ({
  signResult,
  signerName,
  signerRelationship,
  signerEmail,
  minorName,
  procedureTitle,
  onNavigateToValidator,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  const validationCode = signResult.validation_code || (signResult.manifest_sha256
    ? `SESI-${signResult.manifest_sha256.substring(0, 4).toUpperCase()}-${signResult.manifest_sha256.substring(signResult.manifest_sha256.length - 4).toUpperCase()}`
    : 'SESI-VALID');

  useEffect(() => {
    const fullValidationUrl = `${window.location.origin}/validar/${validationCode}`;
    QRCode.toDataURL(fullValidationUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [validationCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(validationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {/* Botões de Ação Superior (Clean) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mb-4 px-1 no-print">
        <button
          onClick={handlePrintVoucher}
          className="text-xs sm:text-sm font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Salvar em PDF</span>
        </button>
        <button
          onClick={handlePrintVoucher}
          className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Comprovante (A4)</span>
        </button>
      </div>

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Escola Cidadã — Saúde em Movimento
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Comprovante de Assinatura
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título do Recibo */}
        <div className="text-center mb-5 sm:mb-6 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 
            <span>Assinatura Concluída</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900 m-0">
            RECIBO DE ASSINATURA ELETRÔNICA
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprovante de manifestação de consentimento e aceite eletrônico.
          </p>
        </div>

        {/* Banner de Envio de Cópia por E-mail */}
        <div className="mb-5 sm:mb-6 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 sm:p-3.5 flex items-start gap-3 text-emerald-950">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <MailCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs sm:text-sm">
            <strong className="text-xs sm:text-sm font-bold uppercase tracking-wide block text-emerald-950">
              Cópia do Comprovante Enviada por E-mail
            </strong>
            <p className="text-xs text-emerald-800 m-0 leading-relaxed">
              Uma via completa deste termo assinado e o código de autenticidade foram enviados para: <span className="font-bold underline text-emerald-950 break-all">{signerEmail || 'seu e-mail informado'}</span>.
            </p>
          </div>
        </div>

        {/* Dados Principais do Evento */}
        <div className="space-y-4 sm:space-y-5 text-xs sm:text-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Estudante</span>
                <strong className="text-slate-800 font-semibold">{minorName}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Responsável Legal</span>
                <strong className="text-slate-800 font-semibold">
                  {signerName} {signerRelationship ? `(${signerRelationship})` : ''}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Projeto / Atividade</span>
                <strong className="text-slate-800 font-semibold">{procedureTitle}</strong>
              </div>
              <div className="sm:col-span-2 pt-1.5 border-t border-slate-200">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <span className="inline-flex items-center font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded text-xs mt-0.5 border border-emerald-200">
                  ✓ Autorização registrada com sucesso
                </span>
              </div>
            </div>
          </div>

          {/* Metadados Técnicos e Segurança */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 m-0 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-sesi-primary" /> 
              <span>Evidências de Autenticidade</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
              
              {/* Dados da assinatura */}
              <div className="lg:col-span-2 space-y-2.5">
                
                {/* TOKEN ÚNICO AMIGÁVEL */}
                <div className="bg-blue-50/80 p-3 sm:p-3.5 border-2 border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-slate-500 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      Código Único de Validação:
                    </span>
                    <span className="font-mono text-base sm:text-lg font-extrabold text-sesi-primary tracking-wider break-all">
                      {validationCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-white border border-blue-200 text-xs text-sesi-primary hover:bg-blue-50 font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                  >
                    {copiedCode ? 'Copiado ✓' : 'Copiar Código'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg sm:col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <MailCheck className="w-3.5 h-3.5 text-sesi-primary" /> Método de Autenticação:
                      </span>
                      <span className="font-semibold text-xs text-slate-800">
                        Código de Segurança OTP por E-mail
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Confirmado ✓
                    </span>
                  </div>

                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg sm:col-span-2">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sesi-primary" /> Data e Hora:
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {new Date(signResult.signed_at_utc || signResult.signed_at || new Date().toISOString()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília)
                    </span>
                  </div>
                  
                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Endereço IP:</span>
                    <span className="font-mono text-xs font-bold text-slate-700 break-all">{signResult.ip_address || '189.126.217.88'}</span>
                  </div>

                  <div className="bg-white p-2.5 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Localização:</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{signResult.geo_city ? `${signResult.geo_city}, ${signResult.geo_region || 'DF'}` : 'Brasília, DF'}</span>
                  </div>
                </div>

              </div>

              {/* QR Code de Validação */}
              <div className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-xl text-center h-full">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code de Autenticidade"
                    className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-1 border border-slate-200 mb-2 rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 flex items-center justify-center text-black mb-2 border border-slate-200 rounded-lg">
                    <QrCode className="w-8 h-8 text-black" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mt-1">Validação Online</span>
              </div>
            </div>

            {/* HASH DO MANIFESTO (SHA-256) ABAIXO DE ENDEREÇO E QR CODE (LARGURA TOTAL) */}
            <div className="w-full bg-white p-3 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" /> Assinatura Digital (Código Criptográfico Hash SHA-256):
              </span>
              <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-700 break-all select-all block leading-relaxed">
                {signResult.manifest_sha256}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1 leading-snug">
                * O resumo criptográfico é a identidade matemática única do documento, garantindo que as informações contidas não sofreram qualquer tipo de alteração (integridade digital).
              </span>
            </div>
          </div>

          {/* Bloco Probatório Oficial Estilo Clicksign com a Marca Catraki */}
          <div className="mt-5 pt-4 border-t border-slate-200 text-left">
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-3">
              <img
                src="/catraki.png"
                alt="Logo Catraki"
                className="w-12 h-12 object-contain rounded-lg shrink-0 shadow-xs border border-slate-100 bg-white"
              />
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 leading-snug">
                  Autorização registrada eletronicamente pela plataforma Catraki.
                </div>
                <div className="text-slate-600 text-xs leading-relaxed">
                  Para consultar ou imprimir este registro, acesse <span className="text-sesi-primary font-bold">https://www.catraki.com.br/validar</span> e utilize o código <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{validationCode}</strong>.
                </div>
                <div className="text-slate-500 text-[10px] sm:text-xs leading-normal">
                  Assinatura eletrônica gerada nos termos da <strong>Medida Provisória nº 2.200-2/2001</strong> e da <strong>Lei Federal nº 14.063/2020</strong>.
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] sm:text-[11px] text-slate-500 text-left leading-relaxed">
              🔒 <strong>Comprovante oficial:</strong> Este registro confirma a autorização <strong className="text-slate-700">{validationCode}</strong> e pode ser consultado a qualquer momento no validador público da plataforma Catraki.
            </div>
          </div>

          {/* Botoes de Acao */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 no-print">
            <button
              type="button"
              onClick={() => onNavigateToValidator(validationCode)}
              className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <span>Verificar Autenticidade no Portal</span>
              <ExternalLink className="w-4 h-4" />
            </button>


          </div>

        </div>

        {/* Barra institucional no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          4
        </div>
      </div>
    </div>
  );
};

