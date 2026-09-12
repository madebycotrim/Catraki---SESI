import { useState, useEffect } from 'react';
import { Header } from './components/common/Header.tsx';
import { SchoolSelectionScreen } from './components/common/SchoolSelectionScreen.tsx';
import { StatusAlertScreen } from './components/common/StatusAlertScreen.tsx';
import { SignerWizard } from './components/signer/SignerWizard.tsx';
import { PublicValidator } from './components/validator/PublicValidator.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { PrivacyPolicy } from './components/common/PrivacyPolicy.tsx';
import { TermsOfUse } from './components/common/TermsOfUse.tsx';
import { apiClient } from './lib/api.ts';

export type AppView = 'school-select' | 'no-school-error' | 'signer' | 'validator' | 'admin' | 'privacy' | 'terms';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('school-select');
  const [activeSignerToken, setActiveSignerToken] = useState('');
  const [activeSchoolSlug, setActiveSchoolSlug] = useState('');
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

      // Rotas com identificador explícito de escola (ex: /autorizar/cemeit ou /autorizar/nova-escola)
      const prefixosEscola = ['/autorizar/', '/termo/', '/escola/', '/escolacidada/'];
      const prefixoEncontrado = prefixosEscola.find((pref) => path.startsWith(pref));

      if (prefixoEncontrado) {
        const slug = path.substring(prefixoEncontrado.length).trim().replace(/\/$/, '');
        if (slug) {
          setActiveSchoolSlug(slug);
          setActiveSignerToken(slug);
          setCurrentView('signer');
          return;
        }
        // Se a rota for apenas o prefixo sem slug (ex: /autorizar/), vai para o portal principal
        setActiveSchoolSlug('');
        setActiveSignerToken('');
        setCurrentView('school-select');
        window.history.replaceState({}, '', '/');
        return;
      }

      if (path === '/' || path === '/escolas' || path === '') {
        setActiveSchoolSlug('');
        setActiveSignerToken('');
        setCurrentView('school-select');
        if (path === '/escolas') {
          window.history.replaceState({}, '', '/');
        }
      } else if (path === '/autorizar' || path === '/escolacidada' || path === '/termo' || path === '/escola') {
        setActiveSchoolSlug('');
        setActiveSignerToken('');
        setCurrentView('school-select');
        window.history.replaceState({}, '', '/');
      } else if (path.startsWith('/validar/')) {
        const hash = path.substring('/validar/'.length);
        setActiveValidatorHash(hash);
        setCurrentView('validator');
      } else if (path === '/validar') {
        setActiveValidatorHash('');
        setCurrentView('validator');
      } else if (path === '/revogar') {
        setActiveSchoolSlug('');
        setActiveSignerToken('');
        setCurrentView('school-select');
        window.history.replaceState({}, '', '/');
      } else if (path === '/termos') {
        setCurrentView('terms');
      } else if (path === '/privacidade') {
        setCurrentView('privacy');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else {
        // Redireciona qualquer rota desconhecida para o portal principal
        setActiveSchoolSlug('');
        setActiveSignerToken('');
        setCurrentView('school-select');
        window.history.replaceState({}, '', '/');
      }
    };

    tratarRota();
    window.addEventListener('popstate', tratarRota);
    return () => window.removeEventListener('popstate', tratarRota);
  }, []);

  const navegarParaView = (view: AppView, path: string) => {
    setCurrentView(view);
    window.history.pushState({}, '', path);
  };

  const navigateToSigner = (token?: string, slug?: string) => {
    const targetSlug = slug || (token && !token.startsWith('DOC-') && !token.startsWith('SESI-') ? token : activeSchoolSlug);
    if (!targetSlug) {
      navegarParaView('school-select', '/');
      return;
    }
    setActiveSignerToken(token || targetSlug);
    setActiveSchoolSlug(targetSlug);
    navegarParaView('signer', `/autorizar/${targetSlug}`);
  };

  const navigateToSchoolSelect = () => {
    setActiveSchoolSlug('');
    setActiveSignerToken('');
    navegarParaView('school-select', '/');
  };

  const navigateToValidator = (hash?: string) => {
    if (hash) {
      setActiveValidatorHash(hash);
      navegarParaView('validator', `/validar/${hash}`);
    } else {
      navegarParaView('validator', '/validar');
    }
  };

  const isPublicView = currentView === 'school-select' || currentView === 'no-school-error' || currentView === 'signer' || currentView === 'validator' || currentView === 'privacy' || currentView === 'terms';

  return (
    <div className="min-h-screen flex flex-col bg-[#edf1f5] text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Superior - Oculto para pais (visão pública) */}
      {!isPublicView && (
        <Header 
          currentView={currentView as any} 
          onNavigate={(v) => {
            if (v === 'admin') navegarParaView('admin', '/admin');
            else if (v === 'signer') {
              if (activeSchoolSlug) {
                navegarParaView('signer', `/autorizar/${activeSchoolSlug}`);
              } else {
                navigateToSchoolSelect();
              }
            }
            else if (v === 'validator') navegarParaView('validator', '/validar');
          }} 
        />
      )}

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col w-full ${isPublicView ? 'items-center pt-2 sm:pt-6 md:pt-10' : ''}`}>

        {currentView === 'no-school-error' && (
          <div className="w-full max-w-xl px-2 sm:px-6 md:px-8 py-4 sm:py-8">
            <StatusAlertScreen
              scenario="missing_school_slug"
              customReason="Nenhuma escola foi especificada no endereço de acesso. Para abrir o formulário de autorização eletrônica escolar, é necessário utilizar o link direto com o identificador da escola (exemplo: catraki.com.br/autorizar/cemeit)."
              onPrimaryAction={() => navegarParaView('school-select', '/')}
              primaryActionLabel="Consultar escolas cadastradas"
            />
          </div>
        )}

        {currentView === 'school-select' && (
          <SchoolSelectionScreen
            onSelectSchool={(slug) => navigateToSigner(slug, slug)}
            onNavigateToValidator={() => navigateToValidator()}
            onNavigateToAdmin={() => navegarParaView('admin', '/admin')}
            onNavigateToPrivacy={() => navegarParaView('privacy', '/privacidade')}
            onNavigateToTerms={() => navegarParaView('terms', '/termos')}
          />
        )}

        {currentView === 'signer' && (
          <div className="w-full max-w-4xl px-2 sm:px-6 md:px-8 py-2 sm:py-4">
            <SignerWizard
              key={activeSchoolSlug || activeSignerToken || 'signer'}
              initialToken={activeSignerToken}
              schoolSlug={activeSchoolSlug}
              onNavigateToValidator={navigateToValidator}
              onChangeSchool={navigateToSchoolSelect}
            />
          </div>
        )}

        {currentView === 'validator' && (
          <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-4 max-w-4xl mx-auto">
            <PublicValidator 
              key={activeValidatorHash || 'empty'}
              initialHash={activeValidatorHash} 
              onNavigateToSigner={() => (activeSchoolSlug ? navigateToSigner(activeSchoolSlug, activeSchoolSlug) : navigateToSchoolSelect())} 
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
            <PrivacyPolicy onBack={() => (activeSchoolSlug ? navigateToSigner(activeSchoolSlug, activeSchoolSlug) : navigateToSchoolSelect())} />
          </div>
        )}

        {currentView === 'terms' && (
          <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-4 max-w-4xl mx-auto">
            <TermsOfUse onBack={() => (activeSchoolSlug ? navigateToSigner(activeSchoolSlug, activeSchoolSlug) : navigateToSchoolSelect())} />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
