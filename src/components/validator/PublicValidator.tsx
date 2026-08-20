import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Stethoscope,
  Key,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
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
    if (initialHash) {
      handleValidate(initialHash);
    }
  }, [initialHash]);

  const handleValidate = async (targetHash: string) => {
    const cleanHash = targetHash.trim();
    if (!cleanHash) {
      setErrorMessage('Por favor, informe o hash SHA-256 do manifesto ou o código do comprovante.');
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
        setErrorMessage(resp.error || 'Manifesto não localizado ou não constante da trilha de auditoria oficial.');
      }
    } catch {
      setErrorMessage('Erro ao consultar validador de autenticidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner Superior do Validador */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border-l-4 border-l-blue-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Validador Público de Autenticidade
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Verificação Criptográfica de Autorizações Médicas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Consulte a integridade da assinatura eletrônica avançada de procedimentos médicos em menores do SESI Saúde.
            </p>
          </div>
        </div>

        {/* Campo de Busca por Hash */}
        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleValidate(hashInput);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Insira o Hash SHA-256 do Manifesto (64 caracteres hexadecimais)"
                className="w-full px-4 py-3.5 pl-11 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-blue-500 transition-colors"
              />
              <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={loading || !hashInput.trim()}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verificar Autenticidade</span>
            </button>
          </form>
        </div>
      </div>

      {/* Erro de Consulta */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <strong className="block font-semibold">Manifesto Não Reconhecido</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Resultado da Validação Criptográfica */}
      {validationResult && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-800 animate-fadeIn">
          {/* Status Geral de Validade */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  validationResult.document_status === 'signed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : validationResult.document_status === 'revoked'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {validationResult.document_status === 'signed' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <ShieldAlert className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">
                    {validationResult.document_status === 'signed'
                      ? 'Assinatura Íntegra e Válida'
                      : validationResult.document_status === 'revoked'
                      ? 'Consentimento Revogado Posteriormente'
                      : 'Documento Expirado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {validationResult.legal_notice}
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[11px]">Posição na Cadeia de Auditoria:</span>
              <span className="font-mono font-bold text-blue-400 text-sm">
                Bloco #{validationResult.chain_position}
              </span>
            </div>
          </div>

          {/* Se foi revogado, exibe quadro específico da revogação */}
          {validationResult.revocation_info && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/50 text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Informação de Revogação (Art. 18 LGPD)</span>
              </div>
              <p className="text-slate-300">
                <strong>Data da Revogação:</strong> {new Date(validationResult.revocation_info.revoked_at).toLocaleString('pt-BR')}
              </p>
              <p className="text-slate-300">
                <strong>Justificativa:</strong> {validationResult.revocation_info.revoked_reason}
              </p>
              <p className="text-[11px] text-amber-300/80 pt-1">
                * Conforme as regras de não-repúdio e a legislação vigente, a revogação aplica-se a tratamentos futuros e não desfaz os atos médicos praticados enquanto a autorização esteve vigente.
              </p>
            </div>
          )}

          {/* Dados Técnicos e Metadados do Procedimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Bloco Procedimento */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2">
                <Stethoscope className="w-4 h-4 text-blue-400" />
                <span>Procedimento Médico Autorizado</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Título do Procedimento:</span>
                <span className="font-semibold text-white">{validationResult.procedure_title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Iniciais do Menor (Privacidade LGPD):</span>
                <span className="font-semibold text-blue-300">{validationResult.minor_name_initials}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Descrição do Escopo Médico:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed">{validationResult.procedure_description}</p>
              </div>
            </div>

            {/* Bloco Signatário */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs border-b border-slate-800 pb-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Identificação do Representante Legal</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Nome do Signatário:</span>
                <span className="font-semibold text-white">{validationResult.signer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">CPF do Signatário:</span>
                <span className="font-mono text-slate-300">{validationResult.signer_cpf_masked}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Grau de Responsabilidade:</span>
                <span className="text-slate-200">{validationResult.signer_relationship}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Método de Verificação de Vínculo:</span>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[11px] border border-blue-900 font-mono">
                  {validationResult.identity_method === 'matricula_sesi' ? 'Matrícula SESI Presencial' : 'Revisão Manual Documental'}
                </span>
              </div>
            </div>
          </div>

          {/* Provas Criptográficas e Carimbo do Tempo (TSA) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs font-mono">
            <div className="flex items-center gap-2 font-sans font-semibold text-slate-300 border-b border-slate-800 pb-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Evidências Criptográficas do Registro</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">Hash SHA-256 do Manifesto:</span>
              <span className="text-blue-300 text-[11px] break-all select-all">{validationResult.manifest_sha256}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" /> Carimbo de Tempo UTC:
                </span>
                <span className="text-slate-300 text-[11px]">
                  {new Date(validationResult.signed_at_utc).toUTCString()}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Autoridade de Carimbo do Tempo (TSA):</span>
                <span className="text-emerald-400 text-[11px]">
                  {validationResult.tsa_authority || 'Autoridade de Carimbo do Tempo SESI / RFC 3161'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">Elo Anterior na Cadeia (prev_log_hash):</span>
              <span className="text-slate-400 text-[10px] break-all">
                {validationResult.prev_log_hash || '0000000000000000000000000000000000000000000000000000000000000000 (Bloco Gênesis)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
