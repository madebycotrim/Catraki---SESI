import { useState, useEffect } from 'react';
import { Header } from './components/common/Header.tsx';
import { SignerWizard } from './components/signer/SignerWizard.tsx';
import { PublicValidator } from './components/validator/PublicValidator.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { RevocationPortal } from './components/revocation/RevocationPortal.tsx';
import { apiClient } from './lib/api.ts';

export function App() {
  const [currentView, setCurrentView] = useState<'signer' | 'validator' | 'admin' | 'revoke'>('signer');
  const [activeSignerToken, setActiveSignerToken] = useState('projeto-escola-cidada-2026');
  const [activeSchoolSlug, setActiveSchoolSlug] = useState('cemeit');
  const [activeValidatorHash, setActiveValidatorHash] = useState('');
  const [adminUser, setAdminUser] = useState<any | null>(() => apiClient.getCurrentAdminUser());

  // Sincroniza a URL inicial e lida com botão de avançar/voltar do navegador
  useEffect(() => {
    const tratarRota = async () => {
      const path = window.location.pathname;

      // Tratamento do retorno da Microsoft OAuth 2.0
      if (path === '/admin/callback') {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const errorParam = urlParams.get('error');
        const errorDesc = urlParams.get('error_description');

        if (errorParam) {
          sessionStorage.setItem('admin_login_error', errorDesc || `Erro Microsoft: ${errorParam}`);
        } else if (code && state) {
          const res = await apiClient.processMicrosoftCallback(code, state);
          if (res.success && res.user) {
            setAdminUser(res.user);
          } else {
            sessionStorage.setItem(
              'admin_login_error',
              res.error || (res.details ? (typeof res.details === 'string' ? res.details : JSON.stringify(res.details)) : 'Falha ao autenticar sessão com a Microsoft.')
            );
          }
        }
        setCurrentView('admin');
        window.history.replaceState({}, '', '/admin');
        return;
      }

      if (path.startsWith('/autorizar/')) {
        const slug = path.substring('/autorizar/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/termo/')) {
        const slug = path.substring('/termo/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/escola/')) {
        const slug = path.substring('/escola/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/escolacidada/')) {
        const slug = path.substring('/escolacidada/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setCurrentView('signer');
      } else if (path === '/autorizar' || path === '/escolacidada' || path === '/termo') {
        setActiveSchoolSlug('cemeit');
        setCurrentView('signer');
      } else if (path.startsWith('/validar/')) {
        const hash = path.substring('/validar/'.length);
        setActiveValidatorHash(hash);
        setCurrentView('validator');
      } else if (path === '/validar') {
        setActiveValidatorHash('');
        setCurrentView('validator');
      } else if (path === '/revogar') {
        setCurrentView('revoke');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else {
        // Redireciona a raiz (/) para a rota padrão do Catraki
        setActiveSchoolSlug('cemeit');
        setCurrentView('signer');
        window.history.replaceState({}, '', '/autorizar/cemeit');
      }
    };

    tratarRota();
    window.addEventListener('popstate', tratarRota);
    return () => window.removeEventListener('popstate', tratarRota);
  }, []);

  const navegarParaView = (view: 'signer' | 'validator' | 'admin' | 'revoke', path: string) => {
    setCurrentView(view);
    window.history.pushState({}, '', path);
  };

  const navigateToSigner = (token?: string, slug = 'cemeit') => {
    if (token) setActiveSignerToken(token);
    setActiveSchoolSlug(slug);
    navegarParaView('signer', `/autorizar/${slug}`);
  };

  const navigateToValidator = (hash?: string) => {
    if (hash) {
      setActiveValidatorHash(hash);
      navegarParaView('validator', `/validar/${hash}`);
    } else {
      navegarParaView('validator', '/validar');
    }
  };

  const navigateToRevoke = (token?: string) => {
    if (token) setActiveSignerToken(token);
    navegarParaView('revoke', '/revogar');
  };

  const isPublicView = currentView === 'signer' || currentView === 'validator' || currentView === 'revoke';

  return (
    <div className="min-h-screen flex flex-col bg-[#edf1f5] text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Superior - Oculto para pais (visão pública) */}
      {!isPublicView && (
        <Header 
          currentView={currentView} 
          onNavigate={(v) => {
            if (v === 'admin') navegarParaView('admin', '/admin');
            else if (v === 'signer') navegarParaView('signer', '/autorizar/cemeit');
            else if (v === 'validator') navegarParaView('validator', '/validar');
          }} 
        />
      )}

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col w-full ${isPublicView ? 'items-center pt-12' : ''}`}>

        {currentView === 'signer' && (
          <div className="w-full max-w-4xl p-4 sm:p-8">
            <SignerWizard
              initialToken={activeSignerToken}
              schoolSlug={activeSchoolSlug}
              onNavigateToValidator={navigateToValidator}
              onNavigateToRevoke={navigateToRevoke}
            />
          </div>
        )}

        {currentView === 'validator' && (
          <div className="w-full p-4 sm:p-8 max-w-4xl mx-auto">
            <PublicValidator 
              initialHash={activeValidatorHash} 
              onNavigateToSigner={() => navigateToSigner()} 
            />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="w-full">
            {!adminUser ? (
              <AdminLogin onLoginSuccess={(u) => setAdminUser(u)} />
            ) : (
              <AdminDashboard
                currentUser={adminUser}
                onLogout={() => {
                  apiClient.logoutAdmin();
                  setAdminUser(null);
                }}
                onNavigateToSignerToken={(token, schoolSlug) => navigateToSigner(token, schoolSlug)}
                onNavigateToValidatorHash={(hash) => navigateToValidator(hash)}
              />
            )}
          </div>
        )}

        {currentView === 'revoke' && (
          <div className="w-full p-4 sm:p-8 max-w-4xl mx-auto">
            <RevocationPortal
              token={activeSignerToken}
              onBack={() => navigateToSigner()}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
