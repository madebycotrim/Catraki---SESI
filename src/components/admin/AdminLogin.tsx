import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck, Lock, FileCheck2, Building2 } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess: _onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedError = sessionStorage.getItem('admin_login_error');
      if (savedError) {
        sessionStorage.removeItem('admin_login_error');
        return savedError;
      }
    }
    return null;
  });

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  // Inicia o fluxo oficial com a Microsoft
  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getMicrosoftLoginUrl();
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setError(res.error || 'Não foi possível conectar ao serviço de autenticação Microsoft.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('Erro ao iniciar login corporativo. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="py-4 sm:py-8 px-2 sm:px-6 flex items-center justify-center animate-in fade-in duration-300">
      
      {/* ─── Folha A5 Responsiva (148mm x 210mm) ─── */}
      <div className="document-sheet-a5 w-full max-w-[540px] flex flex-col justify-between overflow-hidden">
        {/* Bloco Superior e Conteúdo */}
        <div>
          {/* Cabeçalho Institucional A5 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-5 pb-3 border-b-2 border-[#034b7f]">
            <div className="flex items-center gap-2.5">
              <img
                src="/catraki.png"
                alt="Catraki"
                className="h-8 sm:h-9 w-auto object-contain rounded"
              />
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Ambiente Seguro</span>
              </div>
              <p className="text-[10px] text-slate-400 m-0">
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título Oficial do Documento */}
          <div className="text-center mb-5">
            <h1 className="text-xs sm:text-sm md:text-[11pt] font-bold text-[#034b7f] uppercase tracking-tight m-0">
              Credencial de Acesso • Gestão de Assinaturas
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1 m-0">
              Escola Cidadã — Saúde em Movimento • Painel Gestor
            </p>
          </div>

          {/* Mensagem de Erro (se houver) */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="m-0 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {/* Cláusula e Declaração de Uso */}
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#034b7f] rounded-r-xl p-3.5 sm:p-4 mb-4 text-xs text-slate-700 leading-relaxed">
            <p className="m-0 mb-1 font-bold text-[#034b7f] uppercase text-[11px]">
              AUTENTICAÇÃO CORPORATIVA EXCLUSIVA
            </p>
            <p className="m-0 text-slate-600">
              O acesso a este ambiente é restrito aos gestores credenciados para emissão, validação e auditoria dos termos de autorização para procedimentos em estudantes.
            </p>
          </div>

          {/* Módulo Central de Autenticação Microsoft */}
          <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 mb-5 shadow-xs">
            <div className="flex items-center justify-center gap-2 mb-3.5">
              <Lock className="w-4 h-4 text-sesi-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Entrar com Conta Institucional
              </span>
            </div>

            {/* Botão Oficial Microsoft */}
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm border border-slate-300 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sesi-primary" />
                  <span>Conectando ao Serviço Microsoft...</span>
                </>
              ) : (
                <>
                  {/* Logotipo Oficial Microsoft (4 quadrados) */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1H10V10H1V1Z" fill="#F25022" />
                    <path d="M11 1H20V10H11V1Z" fill="#7FBA00" />
                    <path d="M1 11H10V20H1V11Z" fill="#00A4EF" />
                    <path d="M11 11H20V20H11V11Z" fill="#FFB900" />
                  </svg>
                  <span className="text-slate-900">Entrar com conta corporativa Microsoft</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Domínio Autorizado */}
            <div className="mt-3.5 text-center">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
                Domínio Institucional Homologado
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                <span className="bg-sky-50 text-sesi-primary text-xs font-mono font-bold px-3 py-1 rounded-md border border-sky-200">
                  @sistemafibra.org.br
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Conformidade e Auditoria Legal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 border-t border-slate-200 pt-3.5">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
              <FileCheck2 className="w-4 h-4 text-sesi-primary shrink-0" />
              <span className="text-[11px] leading-tight"><strong>Lei 14.063/2020</strong><br />Assinatura Eletrônica</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] leading-tight"><strong>LGPD Art. 18</strong><br />Sigilo de Dados</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="text-[11px] leading-tight"><strong>Entra ID (M365)</strong><br />OAuth 2.0 PKCE</span>
            </div>
          </div>
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 font-sans text-xs text-slate-400">
          1
        </div>

        {/* Barra institucional azul sólida no final da folha A5 (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-2.5 bg-[#034b7f] pointer-events-none z-10" />

      </div>
    </div>
  );
};

