import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Printer,
  ShieldCheck,
  FileCheck2,
  UserCheck,
  GraduationCap,
  Activity,
  Clock,
  Lock,
  Ban,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { apiClient } from '../../lib/api.ts';
import { sha256 } from '../../lib/crypto.ts';
import { formatBrasiliaDateTime } from '../../lib/schemas.ts';
import type { PublicValidationResponse } from '../../lib/types.ts';

interface PublicValidatorProps {
  initialHash?: string;
  onNavigateToSigner?: () => void;
}

export const PublicValidator: React.FC<PublicValidatorProps> = ({ initialHash, onNavigateToSigner }) => {
  const [hashInput, setHashInput] = useState(initialHash || '');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<PublicValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pdfCheckStatus, setPdfCheckStatus] = useState<'idle' | 'match' | 'mismatch' | 'unavailable'>('idle');
  const [pdfCheckedHash, setPdfCheckedHash] = useState<string>('');
  const [pdfCheckedName, setPdfCheckedName] = useState<string>('');

  useEffect(() => {
    if (!validationResult?.pdf_sha256 || !pdfCheckedHash) return;
    setPdfCheckStatus(
      pdfCheckedHash.toLowerCase() === validationResult.pdf_sha256.toLowerCase() ? 'match' : 'mismatch'
    );
  }, [validationResult, pdfCheckedHash]);

  useEffect(() => {
    if (initialHash && initialHash.trim().length > 0) {
      setHashInput(initialHash);
      handleValidate(initialHash);
    } else {
      setValidationResult(null);
      setHashInput('');
      setErrorMessage('');
    }
  }, [initialHash]);

  useEffect(() => {
    if (validationResult) {
      const code = validationResult.validation_code || (validationResult.manifest_sha256 ? `CATRAKI-${validationResult.manifest_sha256.substring(0, 4).toUpperCase()}-${validationResult.manifest_sha256.substring(validationResult.manifest_sha256.length - 4).toUpperCase()}` : '');
      const url = `${window.location.origin}/validar/${code}`;
      QRCode.toDataURL(url, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
        .then(setQrCodeDataUrl)
        .catch(() => {});
    }
  }, [validationResult]);

  const handleValidate = async (targetHash: string) => {
    let cleanHash = targetHash.trim();
    if (cleanHash.includes('/validar/')) {
      cleanHash = cleanHash.split('/validar/').pop()?.split('?')[0]?.split('#')[0] || cleanHash;
    }
    cleanHash = cleanHash.replace(/^[/#]+/, '').trim();

    if (!cleanHash) {
       setErrorMessage('Por favor, digite ou cole o código de autenticidade (ex: CATRAKI-XXXX-XXXX) ou o hash SHA-256.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setValidationResult(null);

    try {
      const resp = await apiClient.validatePublic(cleanHash);
      if (resp.success && resp.validation) {
        setValidationResult(resp.validation);
        const finalCode = resp.validation.validation_code || cleanHash;
        window.history.pushState({}, '', `/validar/${finalCode}`);
      } else {
         setErrorMessage(resp.error || 'Nenhum documento foi encontrado com este código. Verifique se o código foi digitado corretamente ou tente com o código SHA-256 completo presente no comprovante.');
      }
    } catch {
       setErrorMessage('Não foi possível verificar o documento no momento. Verifique sua conexão com a internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setValidationResult(null);
    setHashInput('');
    setErrorMessage('');
    window.history.pushState({}, '', '/validar');
  };

  const handleCopyCode = () => {
    if (validationCode) {
      navigator.clipboard.writeText(validationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  const validationCode = validationResult
    ? (validationResult.validation_code || (validationResult.manifest_sha256 ? `CATRAKI-${validationResult.manifest_sha256.substring(0, 4).toUpperCase()}-${validationResult.manifest_sha256.substring(validationResult.manifest_sha256.length - 4).toUpperCase()}` : ''))
    : '';

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      
      {/* Botões de Ação Superior (fora da folha A4) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-1 no-print">
        {onNavigateToSigner ? (
          <button
            type="button"
            onClick={onNavigateToSigner}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </button>
        ) : <div />}

        {validationResult ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSearch}
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Consultar Outro Documento</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante / Salvar PDF</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial ABNT */}
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
              Sistema de Registro e Consulta
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Comprovante de Aceite Eletrônico
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Oficial do Atestado */}
        <div className="text-center mb-5 pb-2">
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900 m-0">
            COMPROVANTE DE ACEITE ELETRÔNICO
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-0">
            Registro de Assinatura Eletrônica Simples (Lei Federal nº 14.063/2020, Art. 4º, I)
          </p>
        </div>

        {/* ─── CASO 1: FORMULÁRIO DE CONSULTA (QUANDO NENHUM DOCUMENTO ESTIVER CONSULTADO) ─── */}
        {!validationResult && (
          <div className="space-y-6">
            <div className="text-center py-2">
              <div className="inline-flex p-3 bg-blue-50 text-sesi-primary rounded-full mb-3 shadow-inner">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                Consulta de Registro de Aceite Catraki
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Consulte o comprovante de aceite e os registros de autorização emitidos pela plataforma.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidate(hashInput);
              }}
              className="max-w-md mx-auto space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="hash-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Código de Validação ou Hash SHA-256 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="hash-input"
                    name="hashInput"
                    type="text"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Ex: CATRAKI-5595-0D62 ou hash SHA-256"
                    autoCapitalize="characters"
                    className="w-full pl-3.5 sm:pl-4 pr-20 py-3 bg-white border border-slate-300 rounded-xl font-mono text-xs sm:text-sm uppercase text-slate-900 tracking-wider focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip && clip.trim()) {
                          setHashInput(clip.trim());
                          setErrorMessage('');
                        }
                      } catch {}
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 text-[11px] font-bold text-sesi-primary bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    title="Colar código copiado"
                  >
                    Colar
                  </button>
                </div>
                 <p className="text-[11px] sm:text-xs text-slate-500 m-0 leading-relaxed">
                   O código de autenticidade está no cabeçalho e no rodapé do comprovante (ou escaneie o QR Code com a câmera do celular).
                 </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !hashInput.trim()}
                className="w-full py-3.5 px-6 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando autenticidade...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verificar Autenticidade do Documento</span>
                  </>
                )}
              </button>

              {/* Atalho para conferir o arquivo PDF diretamente */}
              <div className="pt-2">
                <div className="relative flex items-center justify-center my-2">
                  <span className="h-px w-full bg-slate-200" />
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white shrink-0">
                    ou valide pelo arquivo PDF
                  </span>
                  <span className="h-px w-full bg-slate-200" />
                </div>

                <label className="mt-2 w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50/70 border border-dashed border-slate-300 hover:border-sesi-primary rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-sesi-primary transition-colors cursor-pointer">
                  <FileCheck2 className="w-4 h-4 text-sesi-primary" />
                  <span>Selecionar PDF baixado para validar</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setErrorMessage('');
                      const buf = new Uint8Array(await file.arrayBuffer());
                      const computed = await sha256(buf);
                      setPdfCheckedName(file.name);
                      setPdfCheckedHash(computed);

                      const nameMatch = file.name.match(/(?:CATRAKI|SESI)-[A-F0-9]{4}-[A-F0-9]{4}/i);
                      const rawText = new TextDecoder('latin1').decode(buf);
                      const textMatch = rawText.match(/(?:CATRAKI|SESI)-[A-F0-9]{4}-[A-F0-9]{4}/i);
                      const detectedCode = (nameMatch?.[0] || textMatch?.[0] || '').toUpperCase();

                      if (detectedCode) {
                        setHashInput(detectedCode);
                        await handleValidate(detectedCode);
                      } else {
                        setErrorMessage('Não foi possível identificar o código automaticamente no PDF. Digite o código CATRAKI-XXXX-XXXX acima.');
                      }
                    }}
                  />
                </label>
              </div>

              {/* Selo discreto de confiança e LGPD */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px] text-slate-400">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Status oficial</span>
                <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-sesi-primary" /> Integridade SHA-256</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-500" /> Horário UTC-3</span>
              </div>
            </form>
          </div>
        )}

        {/* ─── CASO 2A: DOCUMENTO REVOGADO, CANCELADO OU EXPIRADO (EXIBE APENAS O ESTRITAMENTE NECESSÁRIO) ─── */}
        {validationResult && (validationResult.document_status !== 'signed' || !validationResult.valid) && (() => {
          const isRevoked = validationResult.document_status === 'revoked';
          const isCancelled =
            validationResult.document_status === 'CANCELADO_POR_ERRO' ||
            validationResult.document_status === 'cancelled_error';
          const statusBadge = isRevoked ? 'REVOGADO' : isCancelled ? 'CANCELADO POR ERRO' : 'EXPIRADO / INVÁLIDO';
          const statusTitle = isRevoked
            ? 'CONSENTIMENTO REVOGADO'
            : isCancelled
            ? 'DOCUMENTO CANCELADO ADMINISTRATIVAMENTE'
            : 'DOCUMENTO EXPIRADO OU SEM VALIDADE';
          const statusSubtitle = isRevoked
            ? 'Este termo foi revogado pelo responsável/titular e não possui mais validade para atendimento.'
            : isCancelled
            ? 'Este registro foi anulado por erro operacional e não possui validade jurídica.'
            : 'Este documento encontra-se expirado ou inválido para atendimento.';
          const eventDate = isRevoked
            ? validationResult.revocation_info?.revoked_at
            : isCancelled
            ? validationResult.cancellation_info?.cancelled_at
            : null;
          const eventReason = isRevoked
            ? validationResult.revocation_info?.revoked_reason
            : isCancelled
            ? validationResult.cancellation_info?.cancellation_reason
            : null;

          return (
            <div className="space-y-4 pb-6 max-w-xl mx-auto">
              <div className="text-center pb-3 border-b border-rose-200 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-rose-50 text-rose-800 border-rose-200">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Status: {statusBadge}</span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-rose-900 uppercase tracking-wide m-0">
                  {statusTitle}
                </h2>
                <p className="text-xs text-slate-600 m-0 leading-relaxed">
                  {statusSubtitle}
                </p>
              </div>

              <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-rose-200/70">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Código de Protocolo
                    </span>
                    <strong className="text-sm sm:text-base font-mono font-extrabold text-slate-900 tracking-wider">
                      {validationCode}
                    </strong>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    <Ban className="w-3.5 h-3.5 text-rose-700" />
                    <span>Sem Validade para Atendimento</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white border border-rose-100 rounded-lg p-2.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Estudante (Iniciais LGPD)
                    </span>
                    <strong className="text-slate-900 font-bold text-xs">
                      {validationResult.minor_name_initials || '—'}
                    </strong>
                  </div>

                  <div className="bg-white border border-rose-100 rounded-lg p-2.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Data do Registro de Invalidação
                    </span>
                    <strong className="text-slate-900 font-bold text-xs">
                      {eventDate ? `${formatBrasiliaDateTime(eventDate)} (BRT)` : 'Registrado no sistema'}
                    </strong>
                  </div>
                </div>

                {eventReason && (
                  <div className="bg-white border border-rose-100 rounded-lg p-2.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Motivo Registrado
                    </span>
                    <p className="text-slate-700 text-xs m-0 leading-relaxed">{eventReason}</p>
                  </div>
                )}

                <div className="bg-white border border-rose-100 rounded-lg p-2.5">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Referência de Auditoria (Bloco #{validationResult.chain_position})
                  </span>
                  <span className="font-mono text-[10px] text-slate-600 break-all block">
                    SHA-256: {validationResult.manifest_sha256}
                  </span>
                </div>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setValidationResult(null);
                    setHashInput('');
                    setErrorMessage('');
                    setPdfCheckStatus('idle');
                    setPdfCheckedHash('');
                    setPdfCheckedName('');
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Consultar Outro Código
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─── CASO 2B: RESULTADO DA VALIDAÇÃO (DOCUMENTO ÍNTEGRO E VÁLIDO — MINIMIZADO CONFORME LGPD) ─── */}
        {validationResult && validationResult.document_status === 'signed' && validationResult.valid && (
          <div className="space-y-4 pb-6">

            {/* Cabeçalho de Autenticidade */}
            <div className="text-center pb-3 border-b border-slate-200 space-y-1.5">
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Documento Autêntico e Válido</span>
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Bloco #{validationResult.chain_position}
                </span>
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide m-0 pt-0.5">
                AUTORIZAÇÃO CONFIRMADA
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 m-0">
                Assinatura Eletrônica Simples (Lei nº 14.063/2020, Art. 4º, I) • Consulta pública minimizada (LGPD Art. 6º, III)
              </p>
            </div>

            {/* Destaque Unificado: Protocolo + Data/Hora */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center shadow-2xs">
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-100/60 border border-blue-200 text-[11px] text-sesi-primary font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs print:hidden"
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
                  {formatBrasiliaDateTime(validationResult.signed_at_utc)}
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  Horário Oficial de Brasília (UTC-3)
                </span>
              </div>
            </div>

            {/* 1. Partes e Finalidade (Dados Minimizados — LGPD) */}
            <div className="space-y-2">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-sesi-primary" />
                <span>1. Partes Envolvidas e Finalidade</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Finalidade / Atividade */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-sesi-primary flex items-center justify-center shrink-0 border border-blue-100">
                    <Activity className="w-4 h-4 text-sesi-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Finalidade / Atividade
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug mt-0.5">
                      {validationResult.procedure_title || 'Escola Cidadã — Saúde em Movimento'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Plataforma Catraki • SESI-DF / UnB
                    </span>
                  </div>
                </div>

                {/* Estudante Beneficiado (Minimizado LGPD Art. 14) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Estudante Beneficiado(a)
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug mt-0.5">
                      {validationResult.minor_name_initials}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      ✓ Identificação abreviada (LGPD Art. 14)
                    </span>
                  </div>
                </div>

                {/* Signatário / Responsável Legal (Card único, sem duplicação) */}
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sesi-primary flex items-center justify-center shrink-0 border border-sky-100">
                      <UserCheck className="w-4 h-4 text-sesi-primary" />
                    </div>
                    <div>
                      <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Signatário / Responsável Legal
                      </span>
                      <strong className="text-slate-900 font-bold text-xs sm:text-sm block mt-0.5">
                        {validationResult.signer_name}
                      </strong>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-slate-600">
                        <span>CPF: <strong className="font-mono text-slate-800">{validationResult.signer_cpf_masked}</strong></span>
                        {validationResult.signer_relationship && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>Vínculo: <strong className="text-slate-800">{validationResult.signer_relationship}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Assinado Eletronicamente</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Escopo do Consentimento (Lista Simétrica — LGPD Art. 8º) */}
            <div className="space-y-2">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Escopo do Consentimento Concedido</span>
              </h3>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-bold block text-xs">
                        Triagens e Avaliação Clínica
                      </strong>
                      <span className="text-slate-500 text-[11px] block leading-snug">
                        Oftalmologia, Odontologia, Fonoaudiologia (Audiometria), Terapia Comunitária Integrativa e Nutrição.
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-center">
                    Autorizado
                  </span>
                </div>

                <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-bold block text-xs">
                        Tratamento de Dados Pessoais (LGPD)
                      </strong>
                      <span className="text-slate-500 text-[11px] block leading-snug">
                        Consentimento específico para atendimento no projeto conforme a Lei nº 13.709/2018.
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-center">
                    Autorizado
                  </span>
                </div>

                {(() => {
                  const authImg = validationResult.auth_image;
                  const isAuthorized = authImg === 'yes' || authImg === true;
                  const isDenied = authImg === 'no' || authImg === false;

                  return (
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {isAuthorized ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : isDenied ? (
                          <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <strong className="text-slate-900 font-bold block text-xs">
                            Uso Institucional de Imagem e Voz (ECA Art. 17)
                          </strong>
                          <span className="text-slate-500 text-[11px] block leading-snug">
                            {isAuthorized
                              ? 'Autorizado livremente pelo responsável legal.'
                              : isDenied
                              ? 'Não autorizado pelo responsável legal (opção facultativa).'
                              : 'Não registrado nesta versão do termo.'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 self-start sm:self-center ${
                          isAuthorized
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isDenied
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isAuthorized ? 'Autorizado' : isDenied ? 'Não Autorizado' : 'Não Registrado'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. Integridade Criptográfica e Conferência */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sesi-primary" />
                  <span>3. Integridade Criptográfica e Conferência</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 normal-case">
                  Assinatura Eletrônica Simples
                </span>
              </h3>

              {/* Fatores de Autenticação (sem expor IP, navegador ou geolocalização) */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  E-mail confirmado (OTP)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Identidade declarada (Art. 299 CP)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-lg text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" />
                  Integridade SHA-256
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-stretch">
                <div className="lg:col-span-3 space-y-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Hash SHA-256 do Registro Eletrônico
                    </span>
                    <div className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-800 break-all select-all leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                      {validationResult.manifest_sha256}
                    </div>
                  </div>

                  {validationResult.pdf_sha256 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Integridade do Arquivo PDF (SHA-256)
                      </span>
                      <div className="font-mono text-[10px] font-bold text-slate-700 break-all select-all bg-white p-2 rounded-lg border border-slate-200">
                        {validationResult.pdf_sha256}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5 print:hidden">
                        <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 text-sesi-primary text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Conferir Arquivo PDF Baixado</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setPdfCheckedName(file.name);
                              const buf = new Uint8Array(await file.arrayBuffer());
                              const computed = await sha256(buf);
                              setPdfCheckedHash(computed);
                              if (!validationResult.pdf_sha256) {
                                setPdfCheckStatus('unavailable');
                              } else if (computed.toLowerCase() === validationResult.pdf_sha256.toLowerCase()) {
                                setPdfCheckStatus('match');
                              } else {
                                setPdfCheckStatus('mismatch');
                              }
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Verificação local no navegador (o arquivo não é enviado).
                        </span>
                      </div>
                      {pdfCheckStatus === 'match' && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                          ✓ Arquivo <strong>{pdfCheckedName}</strong> íntegro e autêntico (SHA-256 idêntico ao PDF original).
                        </div>
                      )}
                      {pdfCheckStatus === 'mismatch' && (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold">
                          ⚠ Atenção: o arquivo <strong>{pdfCheckedName}</strong> possui hash diferente ({pdfCheckedHash.slice(0, 16)}...) e não corresponde ao PDF original registrado.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
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

            {/* Nota LGPD (Minimização & Direitos do Titular) + Aviso Institucional */}
            <div className="space-y-2 pt-1">
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 text-[10.5px] text-slate-600 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-800">Privacidade e Minimização (LGPD — Art. 6º, III e Art. 14):</strong> Dados de rede, dispositivo e identificação escolar completa são ocultados da consulta pública. O titular ou responsável legal pode solicitar acesso integral, correção ou revogação a qualquer momento (Art. 18).
                </div>
                <a
                  href="/titular"
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-white hover:bg-blue-50 text-sesi-primary border border-blue-200 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors shrink-0 no-underline print:hidden"
                >
                  Portal do Titular (LGPD)
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[10px] text-slate-500 leading-relaxed">
                <strong>Aviso Institucional:</strong> Os atendimentos clínicos e avaliações de saúde são de exclusiva responsabilidade das entidades realizadoras do projeto (SESI-DF e Faculdade de Ciências da Saúde da UnB). A Plataforma Catraki atua estritamente como ferramenta tecnológica para emissão e conferência eletrônica das autorizações.
              </div>
            </div>

            <div className="text-center pt-1 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setValidationResult(null);
                  setHashInput('');
                  setErrorMessage('');
                  setPdfCheckStatus('idle');
                  setPdfCheckedHash('');
                  setPdfCheckedName('');
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                Consultar Outro Código
              </button>
            </div>
          </div>
        )}

        {/* Rodapé limpo */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-blue-900 overflow-hidden pointer-events-none z-10 leading-none" />

      </div>
    </div>
  );
};
