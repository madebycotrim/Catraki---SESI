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
  Sparkles,
  Ban,
  HelpCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { apiClient } from '../../lib/api.ts';
import { formatUserAgent, formatBrasiliaDateTime } from '../../lib/schemas.ts';
import type { PublicValidationResponse } from '../../lib/types.ts';

interface PublicValidatorProps {
  initialHash?: string;
  onNavigateToSigner?: () => void;
}

export const PublicValidator: React.FC<PublicValidatorProps> = ({ initialHash }) => {
  const [hashInput, setHashInput] = useState(initialHash || '');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<PublicValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

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
      {validationResult && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-1 no-print">
          <button
            onClick={handleResetSearch}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Consultar Outro Documento</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante / Salvar PDF</span>
            </button>
          </div>
        </div>
      )}

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
            Registro de Assinatura Eletrônica Simples (Lei Federal nº 14.063/2020)
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
                    placeholder="Digite ou cole o código de autenticidade (ex: CATRAKI-0AD2-2A49) ou hash SHA-256..."
                    autoCapitalize="characters"
                    className="w-full px-3.5 sm:px-4 py-3 bg-white border border-slate-300 rounded-xl font-mono text-xs sm:text-base uppercase text-slate-900 tracking-wider focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                  />
                </div>
                 <p className="text-[11px] sm:text-xs text-slate-500 m-0 leading-relaxed">
                   O código de autenticidade está impresso no rodapé do comprovante de assinatura. Você também pode obtê-lo escaneando o QR Code do documento com a câmera do celular.
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
                className="w-full py-3.5 px-6 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
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
            </form>
          </div>
        )}

        {/* ─── CASO 2: RESULTADO DA VALIDAÇÃO (DOCUMENTO ÍNTEGRO E VÁLIDO) ─── */}
        {validationResult && (
          <div className="space-y-3 sm:space-y-4 pb-6">
            
            {/* Status do Documento */}
            <div className="text-center pb-2 border-b border-slate-200 space-y-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                validationResult.document_status === 'signed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {validationResult.document_status === 'signed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                <span>{validationResult.document_status === 'signed' ? 'Aceite Registrado com Sucesso' : 'Status: ' + validationResult.document_status}</span>
              </div>
              
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 uppercase tracking-wide m-0">
                {validationResult.document_status === 'signed' ? 'AUTORIZAÇÃO CONFIRMADA' : 'DOCUMENTO REVOGADO / EXPIRADO'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 m-0">
                Registro de Auditoria Digital: Bloco #{validationResult.chain_position} • {validationResult.legal_notice}
              </p>
            </div>

            {/* Destaque do Código Único de Validação */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
              <div>
                <span className="block text-[9px] sm:text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                  Código de Protocolo do Aceite
                </span>
                <strong className="text-sm sm:text-lg font-mono font-extrabold text-sesi-primary tracking-wider break-all block mt-0.5">
                  {validationCode}
                </strong>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                <span>Aceite Registrado Eletronicamente</span>
              </span>
            </div>

            {/* 1. Dados da Autorização e Partes Envolvidas (Sem textos truncados) */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-sesi-primary" />
                <span>1. Dados da Autorização e Partes Envolvidas</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                {/* Card 1: Projeto / Finalidade */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-sesi-primary flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-sesi-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Atividade
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug">
                      {validationResult.procedure_title || 'Escola Cidadã — Saúde em Movimento'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Plataforma Catraki
                    </span>
                  </div>
                </div>

                {/* Card 2: Estudante Beneficiado */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Estudante Beneficiado(a)
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug">
                      {validationResult.minor_name_initials}
                    </strong>
                    {(validationResult.minor_series || validationResult.minor_class || validationResult.minor_turn) && (
                      <span className="text-[10px] text-slate-600 block mt-0.5 font-medium">
                        {[
                          validationResult.minor_series ? `Série: ${validationResult.minor_series}` : '',
                          validationResult.minor_class ? `Turma: ${validationResult.minor_class}` : '',
                          validationResult.minor_turn ? `Turno: ${validationResult.minor_turn}` : ''
                        ].filter(Boolean).join(' • ')}
                      </span>
                    )}
                    <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                      ✓ Autorização confirmada (nome abreviado para proteger a privacidade do estudante)
                    </span>
                  </div>
                </div>

                {/* Card 3: Responsável Legal (Assinante) */}
                <div className="sm:col-span-2 bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sesi-primary flex items-center justify-center shrink-0 border border-sky-100 mt-0.5 sm:mt-0">
                      <UserCheck className="w-3.5 h-3.5 text-sesi-primary" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Responsável Legal (Signatário)
                      </span>
                      <strong className="text-slate-900 font-bold text-xs block">
                        {validationResult.signer_name} {validationResult.signer_relationship ? `(${validationResult.signer_relationship})` : ''}
                      </strong>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-600">
                        <span>CPF: <strong className="font-mono text-slate-700">{validationResult.signer_cpf_masked}</strong></span>
                        {validationResult.signer_relationship && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>Vínculo: <strong className="text-slate-700">{validationResult.signer_relationship}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold shrink-0 self-start sm:self-auto">
                    <ShieldCheck className="w-3 h-3 text-sesi-primary" />
                    <span>Titular / Representante Legal</span>
                  </span>
                </div>

              </div>
            </div>

            {/* 2. Escopo das Autorizações e Consentimento Clínico */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Escopo do Consentimento e Autorizações Concedidas</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2 sm:p-2.5 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-950 font-bold block text-[11px]">Triagens e Avaliação Clínica</strong>
                    <span className="text-emerald-800 text-[10px] block mt-0.5 leading-snug">
                      Consultas preventivas, acuidade visual e avaliação bucal autorizadas.
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2 sm:p-2.5 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-950 font-bold block text-[11px]">Tratamento de Dados (LGPD)</strong>
                    <span className="text-emerald-800 text-[10px] block mt-0.5 leading-snug">
                      Termo de consentimento e dados de autorização protegidos nos termos da Lei 13.709/18 (LGPD).
                    </span>
                  </div>
                </div>



                {/* Uso Institucional de Imagem / Voz - 3 estados */}
                {(() => {
                  const authImg = validationResult.auth_image;
                  const isAuthorized = authImg === 'yes' || authImg === true;
                  const isDenied = authImg === 'no' || authImg === false;
                  // null/undefined = doc antigo, não registrado
                  return (
                    <div className={`border rounded-xl p-2 sm:p-2.5 flex items-start gap-2 ${
                      isAuthorized ? 'bg-emerald-50/60 border-emerald-200/80' :
                      isDenied ? 'bg-red-50 border-red-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      {isAuthorized ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : isDenied ? (
                        <Ban className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className={`font-bold block text-[11px] ${
                          isAuthorized ? 'text-emerald-950' :
                          isDenied ? 'text-red-900' :
                          'text-slate-500'
                        }`}>
                          Uso Institucional de Imagem / Voz
                        </strong>
                        <span className={`text-[10px] block mt-0.5 leading-snug ${
                          isAuthorized ? 'text-emerald-800' :
                          isDenied ? 'text-red-700' :
                          'text-slate-400'
                        }`}>
                          {isAuthorized
                            ? 'Opção manifestada livremente pelo responsável (ECA Art. 17).'
                            : isDenied
                            ? 'Negado pelo responsável (Opção Opcional).'
                            : 'Não registrado — autorização assinada antes desta versão do sistema.'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* 3. Evidências Digitais de Validação & Trilha de Custódia (Padrão Profissional) */}
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-sesi-primary" />
                  <span>3. Evidências Digitais e Trilha de Custódia</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500 normal-case">
                  Registro de Assinatura Simples
                </span>
              </h3>

              {/* Card Unificado do Signatário com Layout Profissional Padronizado */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                
                {/* Header do Card com Nome do Signatário e Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-sesi-primary flex items-center justify-center font-bold text-sm border border-blue-100">
                      <UserCheck className="w-5 h-5 text-sesi-primary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Signatário Autenticado
                      </span>
                      <strong className="text-sm sm:text-base font-extrabold text-slate-900 block leading-tight">
                        {validationResult.signer_name}
                      </strong>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Assinatura Concluída</span>
                  </span>
                </div>

                {/* Grid com Linhas de Metadados Claros (Estilo DocuSign / ZapSign) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                  
                  {/* CPF */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">CPF:</span>
                    <strong className="font-mono text-slate-800 font-bold">{validationResult.signer_cpf_masked}</strong>
                  </div>

                  {/* Assinou em */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sesi-primary" /> Assinou em:
                    </span>
                    <strong className="font-mono text-slate-800 font-bold">
                      {formatBrasiliaDateTime(validationResult.signed_at_utc)} <span className="text-[10px] font-normal text-slate-400 font-sans">(Horário de Brasília)</span>
                    </strong>
                  </div>

                  {/* Token do Documento */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Token do Documento:</span>
                    <strong className="font-mono text-sesi-primary font-bold">{validationCode}</strong>
                  </div>

                  {/* Localização */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Localização (Borda):</span>
                    <strong className="text-slate-800 font-semibold truncate max-w-[240px]">
                      {validationResult.geolocation || 'Brasília, DF, Brasil'}
                    </strong>
                  </div>

                  {/* IP com Tag de Versão */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Endereço IP:</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold">
                      <span>{validationResult.ip_address || 'Não registrado'}</span>
                      {validationResult.ip_address && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-sans border ${
                          validationResult.ip_address.includes(':')
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {validationResult.ip_address.includes(':') ? 'IPv6' : 'IPv4'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dispositivo */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Dispositivo:</span>
                    <strong className="text-slate-800 font-semibold truncate max-w-[240px]">
                      {formatUserAgent(validationResult.user_agent)}
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      E-mail confirmado (Código OTP)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Identidade declarada (Art. 299 CP)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-lg text-[11px] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-sesi-primary" />
                      Integridade criptográfica SHA-256
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
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
                        {validationResult.signer_name}
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
                        <Lock className="w-3.5 h-3.5 text-sesi-primary" /> Código Criptográfico de Integridade (Hash SHA-256)
                      </span>
                      <div className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-800 break-all select-all leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                        {validationResult.manifest_sha256}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1.5 leading-snug">
                        Resumo criptográfico imutável que garante a integridade e inviolabilidade do documento assinado.
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

                {/* Disclaimer Institucional */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[10px] text-slate-500 leading-relaxed">
                  <strong>Aviso Institucional:</strong> Os dados e procedimentos clínicos são de exclusiva responsabilidade dos Controladores (SESI-DF e Faculdade de Ciências da Saúde da UnB). A Plataforma Catraki atua exclusivamente como infraestrutura tecnológica para registro de log e emissão de hash, não possuindo CNPJ, acesso ou ingerência sobre os dados de saúde ou o conteúdo firmado entre as partes.
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Rodapé limpo */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-3 bg-blue-900 overflow-hidden pointer-events-none z-10 leading-none" />

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>

      </div>
    </div>
  );
};
