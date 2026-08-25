import { useState, useEffect } from 'react';
import { Header } from './components/common/Header.tsx';
import { SignerWizard } from './components/signer/SignerWizard.tsx';
import { PublicValidator } from './components/validator/PublicValidator.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { PrivacyPolicy } from './components/common/PrivacyPolicy.tsx';
import { TermsOfUse } from './components/common/TermsOfUse.tsx';
import { apiClient } from './lib/api.ts';

export function App() {
  const [currentView, setCurrentView] = useState<'signer' | 'validator' | 'admin' | 'privacy' | 'terms'>('signer');
  const [activeSignerToken, setActiveSignerToken] = useState('projeto-escola-cidada-2026');
  const [activeSchoolSlug, setActiveSchoolSlug] = useState('cemeit');
  const [activeValidatorHash, setActiveValidatorHash] = useState('');
  const [adminUser, setAdminUser] = useState<any | null>(() => apiClient.getCurrentAdminUser());

  // Observa expiração ou logout da sessão administrativa
  useEffect(() => {
    const unsubscribe = apiClient.addAuthErrorListener(() => {
      setAdminUser(null);
    });
    return () => unsubscribe();
  }, []);

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
        setActiveSignerToken(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/termo/')) {
        const slug = path.substring('/termo/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setActiveSignerToken(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/escola/')) {
        const slug = path.substring('/escola/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setActiveSignerToken(slug);
        setCurrentView('signer');
      } else if (path.startsWith('/escolacidada/')) {
        const slug = path.substring('/escolacidada/'.length) || 'cemeit';
        setActiveSchoolSlug(slug);
        setActiveSignerToken(slug);
        setCurrentView('signer');
      } else if (path === '/autorizar' || path === '/escolacidada' || path === '/termo') {
        setActiveSchoolSlug('cemeit');
        setActiveSignerToken('cemeit');
        setCurrentView('signer');
      } else if (path.startsWith('/validar/')) {
        const hash = path.substring('/validar/'.length);
        setActiveValidatorHash(hash);
        setCurrentView('validator');
      } else if (path === '/validar') {
        setActiveValidatorHash('');
        setCurrentView('validator');
      } else if (path === '/revogar') {
        setCurrentView('signer');
        window.history.replaceState({}, '', '/autorizar/cemeit');
      } else if (path === '/termos') {
        setCurrentView('terms');
      } else if (path === '/privacidade') {
        setCurrentView('privacy');
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

  const navegarParaView = (view: 'signer' | 'validator' | 'admin' | 'privacy' | 'terms', path: string) => {
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

  const isPublicView = currentView === 'signer' || currentView === 'validator' || currentView === 'privacy' || currentView === 'terms';

  return (
    <div className="min-h-screen flex flex-col bg-[#edf1f5] text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Superior - Oculto para pais (visão pública) */}
      {!isPublicView && (
        <Header 
          currentView={currentView as any} 
          onNavigate={(v) => {
            if (v === 'admin') navegarParaView('admin', '/admin');
            else if (v === 'signer') navegarParaView('signer', '/autorizar/cemeit');
            else if (v === 'validator') navegarParaView('validator', '/validar');
          }} 
        />
      )}

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col w-full ${isPublicView ? 'items-center pt-2 sm:pt-6 md:pt-10' : ''}`}>

        {currentView === 'signer' && (
          <div className="w-full max-w-4xl px-2 sm:px-6 md:px-8 py-2 sm:py-4">
            <SignerWizard
              initialToken={activeSignerToken}
              schoolSlug={activeSchoolSlug}
              onNavigateToValidator={navigateToValidator}
            />
          </div>
        )}

        {currentView === 'validator' && (
          <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-4 max-w-4xl mx-auto">
            <PublicValidator 
              key={activeValidatorHash || 'empty'}
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

        {currentView === 'privacy' && (
          <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-4 max-w-4xl mx-auto">
            <PrivacyPolicy onBack={() => navigateToSigner()} />
          </div>
        )}

        {currentView === 'terms' && (
          <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-4 max-w-4xl mx-auto">
            <TermsOfUse onBack={() => navigateToSigner()} />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
