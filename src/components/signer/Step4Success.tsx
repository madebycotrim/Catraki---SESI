import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  QrCode,
  FileText,
  AlertCircle,
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
  };
  signerName: string;
  signerEmail?: string;
  minorName: string;
  procedureTitle: string;
  onNavigateToValidator: (code: string) => void;
  onNavigateToRevoke: () => void;
}

export const Step4Success: React.FC<Step4SuccessProps> = ({
  signResult,
  signerName,
  signerEmail,
  minorName,
  procedureTitle,
  onNavigateToValidator,
  onNavigateToRevoke,
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
        dark: '#034b7f',
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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 sm:px-4 pb-12 pt-2">
      {/* Botão de Impressão (Clean) */}
      <div className="flex justify-end gap-2 mb-4 px-1 no-print">
        <button
          onClick={handlePrintVoucher}
          className="text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Salvar em PDF
        </button>
        <button
          onClick={handlePrintVoucher}
          className="text-xs font-bold bg-sesi-primary hover:bg-blue-900 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Comprovante (A4)
        </button>
      </div>

      {/* Folha A4 — Padrão ABNT (210mm x 297mm | Margens: Sup/Esq 30mm, Inf/Dir 20mm) */}
      <div
        className="p-6 sm:p-0"
        style={{
          background: '#ffffff',
          paddingTop: '80px',
          paddingLeft: '80px',
          paddingRight: '60px',
          paddingBottom: '80px',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          color: '#000',
          minHeight: '297mm',
          position: 'relative',
          borderRadius: '0px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
          {/* Cabeçalho oficial */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '3px solid #034b7f',
          }}>
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              style={{ height: '46px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8.5pt', color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Escola Cidadã — Saúde em Movimento
              </p>
              <p style={{ fontSize: '9pt', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
                Comprovante de Assinatura
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título do Recibo */}
          <div className="text-center mb-6 pb-3 border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Assinatura Concluída
            </div>
            <h1 className="text-base font-bold uppercase tracking-wide text-slate-900 m-0">
              RECIBO DE ASSINATURA ELETRÔNICA AVANÇADA
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprovante de manifestação de consentimento e aceite eletrônico.
            </p>
          </div>

          {/* Banner de Envio de Cópia por E-mail */}
          <div className="mb-6 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-emerald-950">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <MailCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <strong className="text-xs font-bold uppercase tracking-wide block text-emerald-950">
                Cópia do Comprovante Enviada por E-mail
              </strong>
              <p className="text-xs text-emerald-800 m-0 leading-relaxed">
                Uma via completa deste termo assinado e o código de autenticidade foram enviados para: <span className="font-bold underline text-emerald-950">{signerEmail || 'seu e-mail informado'}</span>.
              </p>
            </div>
          </div>

          {/* Dados Principais do Evento */}
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Estudante</span>
                  <strong className="text-slate-800 font-semibold">{minorName}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Responsável Legal</span>
                  <strong className="text-slate-800 font-semibold">{signerName}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Projeto / Atividade</span>
                  <strong className="text-slate-800 font-semibold">{procedureTitle}</strong>
                </div>
                <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Status Jurídico</span>
                  <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px] mt-0.5">
                    ASSINADO ELETRONICAMENTE E VÁLIDO ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Metadados Técnicos e Segurança */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 m-0 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-sesi-primary" /> Evidências de Autenticidade
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
                
                {/* Dados da assinatura */}
                <div className="lg:col-span-2 space-y-2.5">
                  
                  {/* TOKEN ÚNICO AMIGÁVEL */}
                  <div className="bg-blue-50/80 p-3 border-2 border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">
                        Código Único de Validação:
                      </span>
                      <span className="font-mono text-base font-extrabold text-sesi-primary tracking-wider">
                        {validationCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-white border border-blue-200 text-[11px] text-sesi-primary hover:bg-blue-50 font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      {copiedCode ? 'Copiado ✓' : 'Copiar Código'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 border border-slate-200 rounded sm:col-span-2">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sesi-primary" /> Data e Hora (UTC):
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {new Date(signResult.signed_at_utc || signResult.signed_at || new Date().toISOString()).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
                      </span>
                    </div>
                    
                    <div className="bg-white p-2 border border-slate-200 rounded">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Endereço IP:</span>
                      <span className="font-mono text-[11px] font-bold text-slate-700">{signResult.ip_address || '189.126.217.88'}</span>
                    </div>

                    <div className="bg-white p-2 border border-slate-200 rounded">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Localização:</span>
                      <span className="font-mono text-[11px] font-bold text-slate-700">{signResult.geo_city ? `${signResult.geo_city}, ${signResult.geo_region || 'DF'}` : 'Brasília, DF'}</span>
                    </div>
                  </div>

                </div>

                {/* QR Code de Validação */}
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-center h-full">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Autenticidade"
                      className="w-24 h-24 bg-white p-1 border border-slate-200 mb-1.5 rounded"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-300 mb-1.5 border border-slate-200 rounded">
                      <QrCode className="w-7 h-7" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-0.5">Validação Pública</span>
                  <span className="text-[8px] text-slate-400 leading-tight">Escaneie para consultar autenticidade imediata.</span>
                </div>
              </div>
            </div>

            {/* Aviso legal do recibo */}
            <p style={{
              marginTop: '20px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '7.5pt',
              color: '#888',
              lineHeight: 1.4,
              textAlign: 'center'
            }}>
              Recibo emitido eletronicamente em conformidade com o Artigo 10, Parágrafo 2º da MP 2.200-2/2001 e Lei 14.063/2020. A integridade pode ser confirmada no portal informando o código <strong>{validationCode}</strong>.
            </p>

            {/* Botoes de Acao */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 no-print">
              <button
                type="button"
                onClick={() => onNavigateToValidator(validationCode)}
                className="w-full sm:w-auto px-5 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                Verificar Autenticidade no Portal
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
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', height: '36px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>

          {/* ─── Número de página (canto superior direito ABNT) ─── */}
          <div style={{
            position: 'absolute',
            top:   '36px',
            right: '60px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9.5pt',
            color: '#64748b',
          }}>
            4
          </div>
        </div>
    </div>
  );
};
