import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
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
  signerName,
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
      width: 150,
      margin: 1,
      color: {
        dark: '#034b7f',
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

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 pb-8">
      {/* Botão de Impressão (Clean) */}
      <div className="flex justify-end mb-4 px-1 no-print">
        <button
          onClick={handlePrintVoucher}
          className="text-xs font-bold text-sesi-primary hover:text-blue-900 flex items-center gap-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Comprovante
        </button>
      </div>

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
                Comprovante de Assinatura
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título do Recibo */}
          <div className="text-center mb-8 pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Assinatura Registrada
            </div>
            <h1 className="text-base font-bold uppercase tracking-wide text-slate-900 m-0">
              RECIBO DE ASSINATURA ELETRÔNICA QUALIFICADA
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Este recibo comprova a manifestação de consentimento e aceitação do Termo.
            </p>
          </div>

          {/* Dados Principais do Evento */}
          <div className="space-y-6 text-xs sm:text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
              <p className="m-0 leading-relaxed text-slate-700">
                <strong>Projeto / Atividade:</strong> {procedureTitle}
              </p>
              <p className="m-0 leading-relaxed text-slate-700">
                <strong>Estudante Beneficiado:</strong> {minorName}
              </p>
              <p className="m-0 leading-relaxed text-slate-700">
                <strong>Responsável Legal (Assinante):</strong> {signerName}
              </p>
              <p className="m-0 leading-relaxed text-slate-700">
                <strong>Situação do Termo:</strong> <span className="text-emerald-700 font-bold">ASSINADO E VÁLIDO ✓</span>
              </p>
            </div>

            {/* Evidências Digitais */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sesi-primary" /> Evidências e Auditoria Criptográfica
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Dados da assinatura */}
                <div className="lg:col-span-2 space-y-3.5">
                  <div className="bg-white p-3 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Código Único do Documento:</span>
                    <span className="font-mono text-xs font-bold text-slate-800">{signResult.document_id}</span>
                  </div>

                  <div className="bg-white p-3 border border-slate-200 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Hash de Integridade (SHA-256):</span>
                      <button
                        onClick={handleCopyHash}
                        className="text-[10px] text-sesi-primary hover:text-blue-900 font-bold flex items-center gap-0.5"
                      >
                        {copiedHash ? 'Copiado!' : 'Copiar Hash'}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-700 break-all bg-slate-50 p-2 border border-slate-100 rounded leading-relaxed">
                      {signResult.manifest_sha256}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 border border-slate-200 rounded">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sesi-primary" /> Data e Hora (UTC):
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {new Date(signResult.signed_at_utc).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
                      </span>
                    </div>

                    <div className="bg-white p-3 border border-slate-200 rounded">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-sesi-primary" /> Carimbo de Tempo (TSA):
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {signResult.tsa_authority || 'Certificadora SESI'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 border border-slate-200 rounded">
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Assinatura no Bloco Criptográfico:</span>
                    <span className="font-mono text-[10px] text-slate-500 break-all leading-normal">
                      {signResult.log_row_hash}
                    </span>
                  </div>
                </div>

                {/* QR Code de Validação */}
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded text-center h-full">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Autenticidade"
                      className="w-32 h-32 bg-white p-1 border border-slate-200 mb-2"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-slate-300 mb-2 border border-slate-200">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">Validação Pública</span>
                  <span className="text-[10px] text-slate-400 leading-normal">Escaneie com a câmera do celular para verificar a validade do termo.</span>
                </div>
              </div>
            </div>

            {/* Aviso legal do recibo */}
            <p style={{
              marginTop: '40px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '7.5pt',
              color: '#888',
              lineHeight: 1.4,
              textAlign: 'center'
            }}>
              Recibo emitido eletronicamente em conformidade com o Artigo 10, Parágrafo 2º da MP 2.200-2/2001. A integridade do documento original e das assinaturas pode ser confirmada no portal informando a chave de hash SHA-256 acima.
            </p>

            {/* Botoes de Acao */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 no-print">
              <button
                type="button"
                onClick={() => onNavigateToValidator(signResult.manifest_sha256)}
                className="w-full sm:w-auto px-5 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                Verificar no Portal
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onNavigateToRevoke}
                className="text-[10px] font-semibold text-slate-500 hover:text-amber-700 underline flex items-center gap-1 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Revogar consentimento (Art. 18 LGPD)
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
            4
          </div>
        </div>
      </div>
    </div>
  );
};
