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
    <div className="py-8 px-3 sm:px-6 flex items-center justify-center animate-in fade-in duration-300">
      
      {/* ─── Folha A5 — Proporção Real ABNT (148mm x 210mm | Relação 1:1.414) ─── */}
      <div
        className="w-full max-w-[540px] animate-in zoom-in-95 duration-200"
        style={{
          background: '#ffffff',
          minHeight: '764px',
          paddingTop: '42px',
          paddingLeft: '44px',
          paddingRight: '44px',
          paddingBottom: '52px',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '9.5pt',
          lineHeight: '1.5',
          color: '#0f172a',
          position: 'relative',
          borderRadius: '0px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Bloco Superior e Conteúdo */}
        <div>
          {/* Cabeçalho Institucional A5 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '2.5px solid #034b7f',
            }}
          >
            <div>
              <img
                src="/logo-1linha.svg"
                alt="SESI Saúde"
                style={{ height: '38px', objectFit: 'contain' }}
              />
              <span style={{ display: 'block', fontSize: '7pt', color: '#64748b', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Departamento Regional do Distrito Federal
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase' }}>Sistema Oficial</span>
              </div>
              <p style={{ fontSize: '7.5pt', color: '#64748b', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título Oficial do Documento */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 style={{
              fontSize: '11pt',
              fontWeight: 'bold',
              color: '#034b7f',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 4px',
            }}>
              Credencial de Acesso • Gestão de Assinaturas
            </h1>
            <p style={{ fontSize: '8.5pt', color: '#475569', margin: 0 }}>
              Projeto Escola Cidadã — Painel de Controle de Autorizações
            </p>
          </div>

          {/* Mensagem de Erro (se houver) */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="m-0 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {/* Cláusula e Declaração de Uso */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #034b7f',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '8.5pt',
            color: '#334155',
            lineHeight: '1.5',
          }}>
            <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: '#034b7f' }}>
              AUTENTICAÇÃO CORPORATIVA EXCLUSIVA
            </p>
            <p style={{ margin: 0 }}>
              O acesso a este ambiente é restrito aos gestores credenciados para emissão, validação e auditoria dos termos de autorização para procedimentos em estudantes.
            </p>
          </div>

          {/* Módulo Central de Autenticação Microsoft */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #cbd5e1',
            padding: '20px 18px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
              <Lock style={{ width: '15px', height: '15px', color: '#034b7f' }} />
              <span style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>
                Entrar com Conta Institucional
              </span>
            </div>

            {/* Botão Oficial Microsoft */}
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs border border-slate-300 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderRadius: '0px' }}
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
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Domínio Autorizado */}
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Domínio Institucional Homologado
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
                <span style={{ background: '#e0f2fe', color: '#034b7f', fontSize: '7.5pt', fontWeight: 'bold', padding: '3px 12px', border: '1px solid #bae6fd' }}>
                  @sistemafibra.org.br
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Conformidade e Auditoria Legal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            fontSize: '7.5pt',
            color: '#475569',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileCheck2 style={{ width: '14px', height: '14px', color: '#034b7f', flexShrink: 0 }} />
              <span><strong>Lei 14.063/2020</strong><br />Assinatura Avançada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck style={{ width: '14px', height: '14px', color: '#16a34a', flexShrink: 0 }} />
              <span><strong>LGPD Art. 18</strong><br />Sigilo de Dados</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 style={{ width: '14px', height: '14px', color: '#0284c7', flexShrink: 0 }} />
              <span><strong>Entra ID (M365)</strong><br />OAuth 2.0 PKCE</span>
            </div>
          </div>
        </div>

        {/* Rodapé e Barra Institucional */}
        <div style={{ marginTop: '24px' }}>
          {/* Número de página (canto superior direito ABNT) */}
          <div style={{
            position: 'absolute',
            top:   '20px',
            right: '44px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '8.5pt',
            color: '#94a3b8',
          }}>
            1
          </div>

          {/* Barra institucional no final da folha A5 */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', height: '24px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
