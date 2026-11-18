import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  FileText,
  Clock,
  Printer,
  MailCheck,
  AlertTriangle,
  Copy,
  Check,
  UserCheck,
  GraduationCap,
  Activity,
  Lock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatBrasiliaDateTime, isProprioEstudante } from '../../lib/schemas.ts';
import { PRIVACY_POLICY_VERSION, LGPD_RESPONSE_DEADLINE_DAYS } from '../../lib/lgpd.ts';

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
    has_manual_signature?: boolean;
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

  const isSelfSigner = isProprioEstudante(signerRelationship);

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {/* Botões de Ação Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mb-4 px-1 no-print">
        <button
          type="button"
          onClick={() => onNavigateToValidator(validationCode)}
          className="text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 text-sesi-primary border border-slate-300 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir no Validador Público</span>
        </button>
        <button
          type="button"
          onClick={handlePrintVoucher}
          className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar PDF (A4)</span>
        </button>
      </div>

      {/* Folha A4 — Padrão Institucional */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Sistema de Registro e Assinatura
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
        <div className="text-center mb-5 pb-3 border-b border-slate-100 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Assinatura Concluída</span>
          </div>
          <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-900 m-0">
            COMPROVANTE DE ASSINATURA ELETRÔNICA
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 m-0">
            Assinatura Eletrônica Simples — Lei Federal nº 14.063/2020 (Art. 4º, I) • MP nº 2.200-2/2001 (Art. 10, § 2º)
          </p>
        </div>

        {/* Destaque Unificado: Protocolo + Data/Hora */}
        <div className="mb-4 bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center shadow-2xs">
          <div className="flex items-center justify-between gap-2 sm:pr-4 sm:border-r sm:border-blue-200/80">
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                Código de Protocolo
              </span>
              <strong className="text-sm sm:text-base font-mono font-extrabold text-sesi-primary tracking-wider break-all block mt-0.5 select-all">
                {validationCode}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-100/60 border border-blue-200 text-[11px] text-sesi-primary font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs no-print"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="sm:pl-1">
            <span className="block text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-sesi-primary" />
              Data e Hora do Registro
            </span>
            <strong className="font-mono text-sm text-slate-900 font-bold block mt-0.5">
              {formatBrasiliaDateTime(signResult.signed_at_utc || signResult.signed_at || new Date())}
            </strong>
            <span className="text-[10px] text-slate-500 block">
              Horário Oficial de Brasília (UTC-3)
            </span>
          </div>
        </div>

        {/* Avisos de E-mail e Operacional */}
        <div className="space-y-2.5 mb-5">
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 flex items-start gap-3 text-emerald-950">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <MailCheck className="w-4 h-4" />
            </div>
            <div className="text-xs leading-relaxed">
              <strong className="font-bold block text-emerald-950">Cópia Oficial Enviada por E-mail</strong>
              O PDF completo do termo assinado e este comprovante foram enviados para{' '}
              <span className="font-mono font-bold text-emerald-900 select-all break-all">
                {signerEmail || 'seu e-mail informado'}
              </span>.
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 sm:p-3.5 flex items-start gap-3 text-xs text-amber-950 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <strong className="font-bold">Aviso Operacional:</strong> Este comprovante atesta a autorização registrada. Contudo, a assinatura não garante atendimento presencial imediato, que fica condicionado à capacidade diária no local.
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* 1. Partes e Finalidade */}
          <div className="space-y-2">
            <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Partes Envolvidas e Finalidade</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-sesi-primary flex items-center justify-center shrink-0 border border-blue-100">
                  <Activity className="w-4 h-4 text-sesi-primary" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Projeto / Atividade
                  </span>
                  <strong className="text-slate-900 font-bold text-xs block leading-snug mt-0.5">
                    {procedureTitle}
                  </strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Plataforma Catraki • SESI-DF / UnB
                  </span>
                </div>
              </div>

              {isSelfSigner ? (
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Titular / Estudante (Maior de Idade)
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug mt-0.5">
                      {signerName}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      ✓ Autorização em nome próprio
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Estudante Beneficiado(a)
                      </span>
                      <strong className="text-slate-900 font-bold text-xs block leading-snug mt-0.5">
                        {minorName}
                      </strong>
                    </div>
                  </div>

                  <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sesi-primary flex items-center justify-center shrink-0 border border-sky-100">
                        <UserCheck className="w-4 h-4 text-sesi-primary" />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Responsável Legal (Signatário)
                        </span>
                        <strong className="text-slate-900 font-bold text-xs sm:text-sm block mt-0.5">
                          {signerName}
                        </strong>
                        {signerRelationship && (
                          <span className="text-[11px] text-slate-600 block">
                            Vínculo: <strong className="text-slate-800">{signerRelationship}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold shrink-0 self-start sm:self-center">
                      ✓ Assinado Eletronicamente
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Evidências Digitais e Assinatura */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sesi-primary" />
                <span>2. Evidências Digitais e Integridade</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 normal-case">
                Trilha de Custódia
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  E-mail Confirmado (OTP 2FA)
                </span>
                <strong className="font-mono text-xs text-slate-800 font-bold select-all break-all block">
                  {signerEmail || 'Informado no fluxo'}
                </strong>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Modalidade de Autoria
                </span>
                <strong className="text-xs text-slate-800 font-bold block">
                  {signResult.has_manual_signature
                    ? 'Rubrica manuscrita + Código OTP (2FA)'
                    : 'Código OTP por e-mail (2FA) + Declaração'}
                </strong>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Localização (Borda Cloudflare)
                </span>
                <strong className="text-xs text-slate-800 font-bold block">
                  {signResult.geo_city
                    ? `${signResult.geo_city}${signResult.geo_region ? `, ${signResult.geo_region}` : ''}`
                    : 'Brasília, DF'}
                </strong>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Endereço IP Registrado
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong className="font-mono text-xs text-slate-800 font-bold break-all select-all">
                    {signResult.ip_address && signResult.ip_address !== 'não registrado'
                      ? signResult.ip_address
                      : 'Registrado no sistema'}
                  </strong>
                  {signResult.ip_address && signResult.ip_address !== 'não registrado' && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                      signResult.ip_address.includes(':')
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {signResult.ip_address.includes(':') ? 'IPv6' : 'IPv4'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quadro de Assinatura Eletrônica */}
            <div className="p-3 bg-blue-50/40 border border-blue-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[9.5px] font-bold text-blue-900 uppercase tracking-wider block">
                  Assinatura Eletrônica Simples (Lei nº 14.063/2020, Art. 4º, I)
                </span>
                <p className="font-serif italic text-base sm:text-lg text-slate-800 m-0 mt-0.5 font-medium">
                  {signerName}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                ✓ Autenticado ({validationCode})
              </span>
            </div>

            {/* Hash SHA-256 & QR Code (QR apenas na impressão, idêntico ao Comprovante de Aceite Eletrônico) */}
            <div className="grid grid-cols-1 print:grid-cols-4 gap-3 items-stretch">
              <div className="print:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sesi-primary" />
                  Hash SHA-256 do Registro Eletrônico
                </span>
                <div className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-800 break-all select-all leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                  {signResult.manifest_sha256}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">
                  Resumo criptográfico imutável que garante a autenticidade e inviolabilidade do termo assinado.
                </span>
              </div>

              <div className="hidden print:flex bg-white border border-slate-200 rounded-xl p-3 flex-col items-center justify-center text-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code de Validação"
                    className="w-24 h-24 block mx-auto rounded"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 rounded">
                    Gerando QR...
                  </div>
                )}
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1.5 block">
                  Validação Online
                </span>
              </div>
            </div>
          </div>

          {/* 3. Transparência e Informações Obrigatórias (LGPD — mesmo padrão do Comprovante de Aceite Eletrônico) */}
          <div className="space-y-2">
            <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" />
                <span>3. Transparência e Informações Obrigatórias (LGPD)</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 normal-case">
                Lei nº 13.709/2018 (Art. 9º)
              </span>
            </h3>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 text-[11px] leading-relaxed overflow-hidden">
              <div className="p-3">
                <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Controladores e Responsabilidades (Art. 9º, III e VI)
                </span>
                <p className="text-slate-700 m-0">
                  <strong>Universidade de Brasília (UnB)</strong> (CNPJ 00.038.174/0001-43) e <strong>SESI-DF</strong> (CNPJ 03.777.341/0001-08) são os controladores responsáveis pelos atendimentos clínicos. A Plataforma Catraki atua estritamente como operadora tecnológica para emissão e conferência eletrônica do termo.
                </p>
              </div>

              <div className="p-3">
                <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Forma, Duração e Compartilhamento (Art. 9º, II e V)
                </span>
                <p className="text-slate-700 m-0">
                  Armazenamento eletrônico protegido com guarda legal de até <strong>20 anos</strong> (Res. CFM nº 1.821/2007 • Política v{PRIVACY_POLICY_VERSION}). Acesso restrito às equipes clínicas e escolares da UnB/SESI-DF, sem comercialização ou cessão a terceiros.
                </p>
              </div>

              <div className="p-3 bg-blue-50/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="block text-[9.5px] font-bold text-blue-900 uppercase tracking-wider mb-0.5">
                    Encarregado (DPO) e Direitos do Titular (Art. 8º, § 5º; Art. 9º, IV e VII; Art. 18 e 41)
                  </span>
                  <p className="text-slate-700 m-0">
                    DPO: <strong>suporte@catraki.com.br</strong> • Prazo de resposta: <strong>até {LGPD_RESPONSE_DEADLINE_DAYS} dias</strong> (Art. 19, II). Você pode solicitar acesso, correção, eliminação ou <strong>revogar este consentimento gratuitamente a qualquer momento</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 no-print">
                  <a
                    href="/titular"
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-white hover:bg-blue-50 text-sesi-primary border border-blue-200 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors no-underline"
                  >
                    Portal do Titular
                  </a>
                  <a
                    href={`/revogar/${signResult.document_id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors no-underline"
                  >
                    Revogar Consentimento
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé limpo */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-blue-900 overflow-hidden pointer-events-none z-10 leading-none" />
      </div>
    </div>
  );
};

