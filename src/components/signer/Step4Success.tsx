import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  FileText,
  AlertCircle,
  Clock,
  Printer,
} from 'lucide-react';
import QRCode from 'qrcode';

interface Step4SuccessProps {
  signResult: {
    document_id: string;
    manifest_sha256: string;
    log_row_hash: string;
    signed_at_utc: string;
    tsa_authority?: string;
    validation_url: string;
    message: string;
  };
  signerName: string;
  minorName: string;
  procedureTitle: string;
  onNavigateToValidator: (hash: string) => void;
  onNavigateToRevoke: () => void;
}

export const Step4Success: React.FC<Step4SuccessProps> = ({
  signResult,
  minorName,
  procedureTitle,
  onNavigateToValidator,
  onNavigateToRevoke,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    const fullValidationUrl = `${window.location.origin}/validar/${signResult.manifest_sha256}`;
    QRCode.toDataURL(fullValidationUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [signResult.manifest_sha256]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(signResult.manifest_sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Banner Principal de Sucesso */}
      <div className="bg-white p-8 sm:p-12 text-center shadow-sm border border-slate-200 rounded-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
        
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6 border border-green-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-green-50 text-xs font-bold uppercase tracking-widest text-green-800 border border-green-200 mb-4">
          <ShieldCheck className="w-4 h-4" /> Assinatura Eletrônica Registrada
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
          Autorização Escolar Concluída
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          O termo para a atividade <strong>{procedureTitle}</strong> do aluno <strong>{minorName}</strong> foi assinado eletronicamente e encadeado na trilha de auditoria oficial.
        </p>
      </div>

      {/* Comprovante Criptográfico e Evidências Digitais */}
      <div className="bg-slate-50 p-6 sm:p-8 rounded-lg border border-slate-200 shadow-inner">
        <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-5 h-5 text-sesi-primary" />
              Certificado de Assinatura Digital
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Documento assinado nos termos da Medida Provisória nº 2.200-2/2001.
            </p>
          </div>

          <button
            onClick={handlePrintVoucher}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 border border-slate-300 rounded shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sesi-primary" />
            <span>Imprimir PDF Oficial</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mt-6">
          {/* Dados Textuais de Auditoria */}
          <div className="lg:col-span-2 space-y-4 text-sm">
            <div className="bg-white p-4 border border-slate-200 rounded">
              <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">ID do Documento no Sistema:</span>
              <span className="font-mono text-base font-bold text-slate-800">{signResult.document_id}</span>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Hash SHA-256 (Integridade):</span>
                <button
                  onClick={handleCopyHash}
                  className="text-xs text-sesi-primary hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Hash
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-700 break-all bg-slate-50 p-3 border border-slate-100 rounded">
                {signResult.manifest_sha256}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sesi-primary" /> Data e Hora (UTC):
                </span>
                <span className="font-mono text-sm font-bold text-slate-700">
                  {new Date(signResult.signed_at_utc).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
                </span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" /> Carimbo do Tempo (TSA):
                </span>
                <span className="text-sm font-bold text-green-700">
                  {signResult.tsa_authority || 'Autoridade SESI'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded">
              <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">Trilha de Auditoria (Bloco Criptográfico):</span>
              <span className="font-mono text-[11px] text-slate-500 break-all">
                {signResult.log_row_hash}
              </span>
            </div>
          </div>

          {/* QR Code de Validação Pública */}
          <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded text-center h-full">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code de Validação Pública de Autenticidade"
                className="w-40 h-40 bg-white p-2 border border-slate-200 mb-4"
              />
            ) : (
              <div className="w-40 h-40 bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                <QrCode className="w-12 h-12" />
              </div>
            )}
            <span className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Validação Pública</span>
            <span className="text-xs text-slate-500">Escaneie o código para verificar a autenticidade deste documento.</span>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => onNavigateToValidator(signResult.manifest_sha256)}
            className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors rounded"
          >
            <span>Acessar Portal de Validação</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Opção de Revogação LGPD Art. 18 */}
          <button
            onClick={onNavigateToRevoke}
            className="text-xs font-semibold text-slate-500 hover:text-amber-700 underline flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Revogar consentimento (Art. 18 LGPD)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
