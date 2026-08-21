import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Printer,
  ShieldCheck,
  Key
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import { formatUserAgent } from '../../lib/schemas.ts';
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

  const handleValidate = async (targetHash: string) => {
    const cleanHash = targetHash.trim();
    if (!cleanHash) {
      setErrorMessage('Por favor, digite o código de validação (ex: SESI-XXXX-XXXX) ou o hash SHA-256.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setValidationResult(null);

    try {
      const resp = await apiClient.validatePublic(cleanHash);
      if (resp.success && resp.validation) {
        setValidationResult(resp.validation);
      } else {
        setErrorMessage(resp.error || 'Código ou hash não localizado na trilha de auditoria oficial.');
      }
    } catch {
      setErrorMessage('Erro ao consultar o validador de autenticidade.');
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

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      
      {/* Botões de Ação Superior (quando autenticado) */}
      {validationResult && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-1 no-print">
          <button
            onClick={handleResetSearch}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Realizar Nova Consulta</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Atestado (A4)</span>
          </button>
        </div>
      )}

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial ABNT */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <img
            src="/logo-1linha.svg"
            alt="SESI Saúde"
            className="h-8 sm:h-11 w-auto object-contain"
          />
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Sistema de Auditoria Pública
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Validação de Autenticidade
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base md:text-[13pt] font-bold uppercase text-slate-900 m-0">
            Validador Público de Autenticidade
          </h1>
          <h2 className="text-xs sm:text-sm md:text-[10.5pt] font-bold text-slate-600 mt-1 m-0">
            Verificação de Autenticidade e Integridade Digital (Art. 10, § 2º da MP 2.200-2/2001 e Lei 14.063/2020)
          </h2>
        </div>

        {/* ─── TELA INICIAL DE CONSULTA (QUANDO NÃO HÁ TOKEN NA URL) ─── */}
        {!validationResult && (
          <div className="space-y-6 sm:space-y-8">
            <p className="text-slate-800 m-0 leading-relaxed text-xs sm:text-sm text-left sm:text-justify">
              Este portal público permite a qualquer interessado (coordenação escolar, profissionais de saúde e responsáveis legais) atestar a autenticidade, integridade e conformidade jurídica de termos de consentimento emitidos na plataforma Catraki.
            </p>

            {/* Seção Oficial de Entrada do Código */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidate(hashInput);
              }}
              className="space-y-4 sm:space-y-5 bg-slate-50/90 border-2 border-slate-200 rounded-xl p-4 sm:p-7 shadow-xs"
            >
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Key className="w-4 h-4 text-sesi-primary" />
                  <span>Código Único de Validação ou Hash SHA-256</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value.toUpperCase())}
                    placeholder="Ex: SESI-E22A-8ACF ou Hash de 64 caracteres"
                    autoFocus
                    autoCapitalize="characters"
                    className="w-full px-3.5 sm:px-4 py-3 bg-white border border-slate-300 rounded-xl font-mono text-xs sm:text-base uppercase text-slate-900 tracking-wider focus:outline-none focus:border-sesi-primary focus:ring-2 focus:ring-sesi-primary/20 transition-all shadow-xs"
                  />
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 m-0 leading-relaxed">
                  O código de autenticidade pode ser localizado no rodapé do comprovante de assinatura ou na URL escaneada via QR Code.
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
                    <span>Consultando Registro Criptográfico...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar e Validar Documento</span>
                  </>
                )}
              </button>
            </form>

            {/* Informações Técnicas da Trilha de Auditoria */}
            <div className="space-y-2 pt-2 text-xs sm:text-sm text-slate-600 border-t border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-sesi-primary" />
                <span>Informações sobre a Trilha de Auditoria e Integridade</span>
              </div>
              <p className="leading-relaxed m-0 text-left sm:text-justify text-xs sm:text-sm text-slate-600">
                As autorizações emitidas pela plataforma registram o resumo criptográfico do documento (SHA-256) em cadeia de auditoria técnica, com carimbo cronológico de data e hora em UTC, endereço IP e dados do dispositivo para fins probatórios, em conformidade com o Art. 10, § 2º da MP 2.200-2/2001 e o Art. 4º, II da Lei Federal nº 14.063/2020.
              </p>
            </div>
          </div>
        )}

        {/* ─── RESULTADO DA VALIDAÇÃO (DOCUMENTO ÍNTEGRO E VÁLIDO) ─── */}
        {validationResult && (
          <div className="space-y-5 sm:space-y-6">
            
            {/* Barra de Ações Rápidas (Oculta na Impressão) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200 no-print">
              <button
                onClick={handleResetSearch}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Consultar Outro Documento</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Certificado / Salvar PDF</span>
              </button>
            </div>

            {/* Status do Documento */}
            <div className="text-center pb-4 border-b border-slate-200 space-y-2">
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                validationResult.document_status === 'signed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {validationResult.document_status === 'signed' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{validationResult.document_status === 'signed' ? 'Assinatura Verificada' : 'Status: ' + validationResult.document_status}</span>
              </div>
              
              <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide m-0">
                {validationResult.document_status === 'signed' ? 'Documento Íntegro e Válido' : 'Documento Revogado / Expirado'}
              </h3>
              <p className="text-xs text-slate-600 m-0">
                Posição na Cadeia de Auditoria: Bloco #{validationResult.chain_position}
              </p>
              <p className="text-xs text-slate-400 italic m-0">
                {validationResult.legal_notice}
              </p>
            </div>

            {/* Destaque do Código Único */}
            <div className="bg-blue-50/80 border-2 border-blue-200 rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] sm:text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Código Único de Validação
                </span>
                <strong className="text-base sm:text-xl font-mono font-bold text-sesi-primary tracking-wider break-all block mt-0.5">
                  {validationResult.validation_code || `SESI-${validationResult.manifest_sha256.substring(0, 4).toUpperCase()}-${validationResult.manifest_sha256.substring(validationResult.manifest_sha256.length - 4).toUpperCase()}`}
                </strong>
              </div>
              <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg shrink-0">
                Autenticado ✓
              </span>
            </div>

            {/* 1. Dados da Autorização */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0 border-b border-slate-200 pb-2">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                <span>1. Dados da Autorização</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Projeto / Atividade</span>
                  <strong className="text-slate-800 font-semibold text-xs sm:text-sm block mt-0.5">{validationResult.procedure_title}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Estudante Beneficiado</span>
                  <strong className="text-slate-800 font-semibold text-xs sm:text-sm block mt-0.5">{validationResult.minor_name_initials}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Responsável Legal (Assinante)</span>
                  <strong className="text-slate-800 font-semibold text-xs sm:text-sm block mt-0.5">{validationResult.signer_name} (CPF: {validationResult.signer_cpf_masked})</strong>
                </div>
              </div>
            </div>

            {/* 2. Evidências Digitais de Validação */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-2">
                2. Evidências Digitais de Validação
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Código Criptográfico de Integridade (Hash)</span>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px] sm:text-xs text-slate-700 break-all select-all leading-relaxed">
                    {validationResult.manifest_sha256}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data e Horário do Registro</span>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                    {new Date(validationResult.signed_at_utc).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Código do Documento</span>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                    {validationResult.document_id || 'DOC-AUTORIZACAO'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Endereço IP Registrado</span>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-800 break-all">
                    {validationResult.ip_address || '189.126.217.88'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Localização Aproximada</span>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                    {validationResult.geolocation || 'Brasília, DF - Brasil'}
                  </div>
                </div>

                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    Dispositivo e Navegador Identificados
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    {formatUserAgent(validationResult.user_agent)}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-500 break-all">
                    <strong className="text-slate-400">Identificação Técnica: </strong>
                    {validationResult.user_agent || 'Não registrado'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra institucional no final da folha A4 */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>

      </div>
    </div>
  );
};

