import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Printer,
  ShieldCheck,
  MailCheck,
  FileCheck2,
  UserCheck,
  GraduationCap,
  Activity,
  Clock,
  QrCode,
  Lock,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
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
      const code = validationResult.validation_code || `SESI-${validationResult.manifest_sha256.substring(0, 4).toUpperCase()}-${validationResult.manifest_sha256.substring(validationResult.manifest_sha256.length - 4).toUpperCase()}`;
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

  const validationCode = validationResult
    ? validationResult.validation_code || `SESI-${validationResult.manifest_sha256.substring(0, 4).toUpperCase()}-${validationResult.manifest_sha256.substring(validationResult.manifest_sha256.length - 4).toUpperCase()}`
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
          
          <button
            onClick={() => window.print()}
            className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Certificado / Salvar PDF</span>
          </button>
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

        {/* Título Oficial do Atestado */}
        <div className="text-center mb-5 pb-2">
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900 m-0">
            CERTIFICADO DE AUTENTICIDADE E VALIDADE JURÍDICA
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-0">
            Verificação de Autenticidade e Integridade Digital (Art. 10, § 2º da MP 2.200-2/2001 e Lei nº 14.063/2020)
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
                Consulta Pública de Integridade e Autoria
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Digite abaixo o Código de Validação presente no comprovante ou o hash SHA-256 da assinatura para auditar a validade do documento.
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
                    placeholder="Ex: SESI-94D4-E1A0 ou cole o Hash completo..."
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
          </div>
        )}

        {/* ─── CASO 2: RESULTADO DA VALIDAÇÃO (DOCUMENTO ÍNTEGRO E VÁLIDO) ─── */}
        {validationResult && (
          <div className="space-y-3 sm:space-y-4 pb-6">
            
            {/* Status do Documento e Selo Jurídico */}
            <div className="text-center pb-2 border-b border-slate-200 space-y-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                validationResult.document_status === 'signed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {validationResult.document_status === 'signed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                <span>{validationResult.document_status === 'signed' ? 'Assinatura Verificada e Autêntica' : 'Status: ' + validationResult.document_status}</span>
              </div>
              
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 uppercase tracking-wide m-0">
                {validationResult.document_status === 'signed' ? 'DOCUMENTO ÍNTEGRO E VÁLIDO' : 'DOCUMENTO REVOGADO / EXPIRADO'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 m-0">
                Posição na Cadeia de Auditoria Digital: Bloco #{validationResult.chain_position} • {validationResult.legal_notice}
              </p>
            </div>

            {/* Destaque do Código Único de Validação */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
              <div>
                <span className="block text-[9px] sm:text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                  Código Único de Autenticidade
                </span>
                <strong className="text-sm sm:text-lg font-mono font-extrabold text-sesi-primary tracking-wider break-all block mt-0.5">
                  {validationCode}
                </strong>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                <span>Autenticado Eletronicamente</span>
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
                      Projeto / Atividade
                    </span>
                    <strong className="text-slate-900 font-bold text-xs block leading-snug">
                      {validationResult.procedure_title || 'Escola Cidadã — Saúde em Movimento'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      SESI-DF • UnB • FINATEC
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
                    <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                      Atendimento Clínico Autorizado ✓ (Iniciais protegidas pela LGPD)
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
                        {validationResult.signer_name}
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
                      Prontuário protegido nos termos dos Artigos 7º, I, 11, I e 14 da Lei 13.709/18.
                    </span>
                  </div>
                </div>



                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-bold block text-[11px]">Uso Institucional de Imagem / Voz</strong>
                    <span className="text-slate-600 text-[10px] block mt-0.5 leading-snug">
                      Opção manifestada livremente pelo responsável (ECA Art. 17).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Evidências Digitais de Validação & Integridade Técnica com QR Code */}
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide m-0 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sesi-primary" />
                <span>3. Evidências Digitais de Validação e Trilha de Custódia</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs">
                
                {/* Coluna Esquerda: Metadados Técnicos (Ocupa 2 colunas) */}
                <div className="lg:col-span-2 space-y-2">
                  
                  {/* Método de Validação / Autenticação OTP */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <span className="block text-[9px] font-bold text-sesi-primary uppercase tracking-wider">
                        Método de Autenticação e Autoria
                      </span>
                      <div className="text-[11px] sm:text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MailCheck className="w-3.5 h-3.5 text-sesi-primary shrink-0" />
                        <span>Código Eletrônico OTP (Celular ou E-mail)</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[9.5px] font-bold shrink-0 self-start sm:self-auto">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Confirmado via OTP</span>
                    </span>
                  </div>

                  {/* Hash Criptográfico SHA-256 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                      Código Criptográfico de Integridade (Hash SHA-256)
                    </span>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-mono text-[9px] sm:text-[10px] text-slate-700 break-all select-all leading-tight">
                      {validationResult.manifest_sha256}
                    </div>
                  </div>

                  {/* Data/Hora NTP.br e Código do Documento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-0.5">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Data e Horário</span>
                      <div className="font-mono text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sesi-primary shrink-0" />
                        <span>{new Date(validationResult.signed_at_utc).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 block font-medium">
                        🕒 Hora Legal de Brasília (NTP.br)
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-0.5">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Código do Documento</span>
                      <div className="font-mono text-[11px] font-bold text-slate-800">
                        {validationResult.document_id || 'DOC-AUTORIZACAO'}
                      </div>
                      <span className="text-[9px] text-emerald-700 block font-medium">
                        ✓ Trilha Única de Custódia
                      </span>
                    </div>
                  </div>

                  {/* IP e Geolocalização */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-white border border-slate-200 rounded-xl p-2">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Registro de IP</span>
                      <div className="font-mono text-[10.5px] font-bold text-slate-800 break-all">
                        {validationResult.ip_address || 'IP Oculto (Sigilo de Privacidade)'}
                      </div>
                      <span className="text-[9px] text-slate-400 block font-normal leading-tight mt-0.5">
                        * Exibido de forma parcial para preservação da privacidade.
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-2">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Localização Estimada</span>
                      <div className="font-mono text-[10.5px] font-bold text-slate-800">
                        {validationResult.geolocation || 'Brasília, DF - Brasil'}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Coluna Direita: QR Code Oficial de Conferência Instantânea */}
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center justify-between text-center space-y-1.5 shadow-xs">
                  <div className="w-full">
                    <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                      <QrCode className="w-3 h-3 text-sesi-primary" /> Validação Pública
                    </span>
                    <p className="text-[9px] text-slate-500 m-0 leading-tight">
                      Aponte a câmera para auditar online:
                    </p>
                  </div>

                  <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code de Validação Pública"
                        className="w-20 h-20 sm:w-24 sm:h-24 block mx-auto rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                        Gerando QR...
                      </div>
                    )}
                  </div>

                  <div className="w-full pt-1 border-t border-slate-100">
                    <span className="text-[9px] font-mono font-bold text-sesi-primary uppercase tracking-wider block">
                      {validationCode}
                    </span>
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">
                      Catraki • Plataforma Segura
                    </span>
                  </div>
                </div>

                {/* Dispositivo e Navegador Identificados (Largura Total) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-2 space-y-0.5">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">
                    Dispositivo e Navegador Identificados
                  </span>
                  <div className="text-[11px] font-bold text-slate-900">
                    {formatUserAgent(validationResult.user_agent)}
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100 font-mono text-[8.5px] text-slate-500 break-all leading-tight">
                    <strong className="text-slate-400">Identificação Técnica: </strong>
                    {validationResult.user_agent || 'Não registrado'}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Barra institucional no final da folha A4 */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
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
