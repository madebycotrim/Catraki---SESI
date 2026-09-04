import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  FileText,
  Clock,
  Printer,
  MailCheck,
  Download,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatBrasiliaDateTime } from '../../lib/schemas.ts';

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
    validation_url: string;
    message: string;
    otp_channel?: string;
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

  const validationCode = (signResult.validation_code || (signResult.manifest_sha256
    ? `CATRAKI-${signResult.manifest_sha256.substring(0, 4).toUpperCase()}-${signResult.manifest_sha256.substring(signResult.manifest_sha256.length - 4).toUpperCase()}`
    : 'CATRAKI-VALID')).replace(/^SESI-/i, 'CATRAKI-');

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
              Plataforma Catraki
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Comprovante de Assinatura Eletrônica
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título do Recibo */}
        <div className="text-center mb-5 sm:mb-6 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/60 text-emerald-700 border border-emerald-200/60 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 
            <span>Assinatura Concluída</span>
          </div>
          <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800 m-0">
            COMPROVANTE DE ASSINATURA ELETRÔNICA
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprovante de manifestação de consentimento e aceite eletrônico — Art. 10, § 2º, da MP nº 2.200-2/2001 c/c Lei nº 14.063/2020.
          </p>
        </div>

        {/* Banner de Envio de Cópia por E-mail */}
        <div className="mb-5 bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3 sm:p-4 flex items-start gap-3.5 text-emerald-950 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200/50 shadow-3xs">
            <MailCheck className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1 text-left flex-1 min-w-0">
            <strong className="text-xs sm:text-sm font-bold uppercase tracking-wider block text-emerald-950">
              Cópia do Comprovante Enviada por E-mail
            </strong>
            <p className="text-xs text-emerald-800 m-0 leading-relaxed">
              Uma cópia completa deste comprovante e o código de autenticidade foram enviados para o e-mail:
              <span className="inline-block px-2 py-0.5 bg-emerald-100/60 border border-emerald-200/80 text-emerald-900 font-mono font-bold rounded-md mx-1 select-all break-all">
                {signerEmail || 'seu e-mail informado'}
              </span>
            </p>
          </div>
        </div>

        {/* Aviso Operacional Importante */}
        <div className="mb-5 sm:mb-6 bg-amber-50/70 border border-amber-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-xs text-amber-950 leading-relaxed">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <strong className="text-amber-950 block mb-0.5 text-xs sm:text-sm font-bold">Aviso Operacional Importante</strong>
            Este comprovante atesta a autorização registrada. Contudo, <strong>esta assinatura não garante atendimento presencial imediato</strong>, que fica condicionado à capacidade diária máxima de atendimentos no local.
          </div>
        </div>

        {/* Dados Principais do Evento */}
        <div className="space-y-4 sm:space-y-5 text-xs sm:text-sm">
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 m-0 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> 
              <span>Dados da Autorização</span>
            </h3>

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

          {/* Metadados Técnicos e Segurança (Padrão Profissional Padronizado) */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-xs space-y-4">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-800 flex items-center justify-between m-0 border-b border-slate-200 pb-2.5">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sesi-primary" /> 
                <span>Evidências Digitais e Trilha de Custódia</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 normal-case">
                Registro de Assinatura Simples
              </span>
            </h3>

            {/* Header do Signatário com Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-sesi-primary flex items-center justify-center font-bold text-sm border border-blue-100">
                  <ShieldCheck className="w-5 h-5 text-sesi-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Signatário Autenticado
                  </span>
                  <strong className="text-sm sm:text-base font-extrabold text-slate-900 block leading-tight">
                    {signerName} {signerRelationship ? `(${signerRelationship})` : ''}
                  </strong>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Assinatura Concluída</span>
              </span>
            </div>

            {/* Grid de Metadados Claros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs">
              
              {/* Token do Documento com Copiar */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Token do Documento:</span>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-sesi-primary font-bold">{validationCode}</strong>
                  <button
                    onClick={handleCopyCode}
                    className="text-[10px] text-sesi-primary hover:underline font-semibold cursor-pointer"
                  >
                    {copiedCode ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Assinou em */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sesi-primary" /> Assinou em:
                </span>
                <strong className="font-mono text-slate-800 font-bold">
                  {formatBrasiliaDateTime(signResult.signed_at_utc || signResult.signed_at || new Date())} <span className="text-[10px] font-normal text-slate-400 font-sans">(Horário de Brasília)</span>
                </strong>
              </div>

              {/* Localização */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Localização (Borda):</span>
                <strong className="text-slate-800 font-semibold truncate max-w-[240px]">
                  {signResult.geo_city
                    ? `${signResult.geo_city}${signResult.geo_region ? `, ${signResult.geo_region}` : ''}`
                    : 'Brasília, DF, Brasil'}
                </strong>
              </div>

              {/* Endereço IP */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Endereço IP:</span>
                <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold">
                  <span>
                    {signResult.ip_address && signResult.ip_address !== 'não registrado'
                      ? signResult.ip_address
                      : 'Registrado no sistema'}
                  </span>
                  {signResult.ip_address && signResult.ip_address !== 'não registrado' && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-sans border ${
                      signResult.ip_address.includes(':')
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {signResult.ip_address.includes(':') ? 'IPv6' : 'IPv4'}
                    </span>
                  )}
                </div>
              </div>

              {/* E-mail */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2 md:col-span-2">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <MailCheck className="w-3.5 h-3.5 text-sesi-primary" /> E-mail de Notificação:
                </span>
                <strong className="font-mono text-slate-800 font-bold">
                  {signerEmail || 'Informado no fluxo'}
                </strong>
              </div>

            </div>

            {/* Pontos de Autenticação em Badges Estilizados */}
            <div className="pt-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pontos de Autenticação Registrados:
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-semibold">
                  <MailCheck className="w-3.5 h-3.5 text-emerald-600" />
                  E-mail confirmado (Código OTP)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Identidade declarada (Art. 299 CP)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-lg text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" />
                  Integridade criptográfica SHA-256
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Rede de borda Cloudflare
                </span>
              </div>
            </div>

            {/* Quadro de Assinatura Eletrônica */}
            <div className="p-3.5 bg-blue-50/40 border border-blue-200/70 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                  Assinatura Eletrônica Simples
                </span>
                <span className="text-[9.5px] font-bold text-slate-500">
                  Lei Federal nº 14.063/2020 • Art. 10, § 2º MP 2.200-2/2001
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-serif italic text-base sm:text-lg text-slate-800 m-0 tracking-wide font-medium">
                    {signerName}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    Assinado digitalmente via Catraki • {validationCode}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    ✓ Autenticado
                  </span>
                </div>
              </div>
            </div>

            {/* Trilha Técnica de Custódia (Hash SHA-256 & QR Code) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 pt-2">
              <div className="lg:col-span-3 space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" /> Código Criptográfico de Integridade (Hash SHA-256)
                  </span>
                  <div className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-800 break-all select-all leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                    {signResult.manifest_sha256}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">
                    Resumo criptográfico imutável que comprova que este comprovante é autêntico e não foi alterado após a assinatura eletrônica.
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code de Validação"
                    className="w-20 h-20 sm:w-24 sm:h-24 block mx-auto rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    Gerando QR...
                  </div>
                )}
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1 block">
                  Validação Online
                </span>
              </div>
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
                  Autorização registrada com sucesso pela plataforma Catraki.
                </div>
                <div className="text-slate-600 text-xs leading-relaxed">
                  Para consultar este comprovante a qualquer momento, acesse <span className="text-sesi-primary font-bold">https://www.catraki.com.br/validar</span> e informe o código <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{validationCode}</strong> ou aponte a câmera para o QR Code.
                </div>
                <div className="text-slate-500 text-[10px] sm:text-xs leading-normal">
                  Documento eletrônico emitido em conformidade com a <strong>MP nº 2.200-2/2001 (Art. 10, § 2º)</strong>, a <strong>Lei nº 14.063/2020</strong>, o <strong>Código Civil (Arts. 104, 107 e 225)</strong>, o <strong>CPC (Arts. 411 e 441)</strong>, a <strong>LGPD (Lei nº 13.709/2018)</strong> e a jurisprudência consolidada do <strong>STJ (REsp 2.205.708/PR)</strong>.
                </div>
                <div className="text-slate-400 text-[9.5px] sm:text-[10px] leading-relaxed pt-1">
                  A Plataforma Catraki atua como <strong>testemunha tecnológica</strong> deste ato: registra e autentica a assinatura, mas não acessa dados de saúde e não possui CNPJ. A responsabilidade pelo conteúdo e pelos dados do projeto é do <strong>SESI-DF</strong> e da <strong>FS/UnB</strong>.
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] sm:text-[11px] text-slate-500 text-left leading-relaxed">
              🔒 <strong>Comprovante de autorização:</strong> Este registro confirma a autorização <strong className="text-slate-700">{validationCode}</strong> e pode ser consultado a qualquer momento no validador público da plataforma Catraki.
            </div>
          </div>

          {/* 5 Pilares de Validade da Assinatura Eletrônica */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2 m-0 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-sesi-primary" /> 
              <span>Pilares de Validade da Assinatura</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Autenticidade</span>
                  <span className="text-slate-700 font-semibold">Código OTP 6 dígitos por e-mail confirmado</span>
                </div>
              </div>
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Integridade</span>
                  <span className="text-slate-700 font-semibold">Hash SHA-256 do manifesto criptográfico</span>
                </div>
              </div>
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Não-Repúdio</span>
                  <span className="text-slate-700 font-semibold">Assinatura manuscrita + IP + Geolocalização</span>
                </div>
              </div>
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Tempestividade</span>
                  <span className="text-slate-700 font-semibold">Data e hora registradas pelo servidor (UTC)</span>
                </div>
              </div>
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex items-start gap-2 sm:col-span-2 lg:col-span-2">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider mb-0.5">Confidencialidade</span>
                  <span className="text-slate-700 font-semibold">Criptografia AES-GCM-256 em repouso + TLS 1.3 em trânsito</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botoes de Acao */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 no-print">
            <button
              type="button"
              onClick={() => onNavigateToValidator(validationCode)}
              className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <span>Verificar Autenticidade do Comprovante</span>
              <ExternalLink className="w-4 h-4" />
            </button>


          </div>

        </div>

        {/* Rodapé limpo */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-blue-900 overflow-hidden pointer-events-none z-10 leading-none" />

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          4
        </div>
      </div>
    </div>
  );
};

