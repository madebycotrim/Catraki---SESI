import { useState, useEffect } from 'react';
import { Header } from './components/common/Header.tsx';
import { SignerWizard } from './components/signer/SignerWizard.tsx';
import { PublicValidator } from './components/validator/PublicValidator.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { RevocationPortal } from './components/revocation/RevocationPortal.tsx';

export function App() {
  const [currentView, setCurrentView] = useState<'signer' | 'validator' | 'admin' | 'revoke'>('signer');
  const [activeSignerToken, setActiveSignerToken] = useState('projeto-escola-cidada-2026');
  const [activeValidatorHash, setActiveValidatorHash] = useState('');

  // Sincroniza a URL inicial e lida com botão de avançar/voltar do navegador
  useEffect(() => {
    const tratarRota = () => {
      const path = window.location.pathname;
      if (path === '/escolacidada/cemeit') {
        setCurrentView('signer');
      } else if (path.startsWith('/validar/')) {
        const hash = path.substring('/validar/'.length);
        setActiveValidatorHash(hash);
        setCurrentView('validator');
      } else if (path === '/validar') {
        setCurrentView('validator');
      } else if (path === '/revogar') {
        setCurrentView('revoke');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else {
        // Redireciona a raiz (/) ou qualquer rota desconhecida para o termo
        setCurrentView('signer');
        window.history.replaceState({}, '', '/escolacidada/cemeit');
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

  const navigateToSigner = (token?: string) => {
    if (token) setActiveSignerToken(token);
    navegarParaView('signer', '/escolacidada/cemeit');
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Superior - Oculto para pais (visão pública) */}
      {!isPublicView && (
        <Header 
          currentView={currentView} 
          onNavigate={(v) => {
            if (v === 'admin') navegarParaView('admin', '/admin');
            else if (v === 'signer') navegarParaView('signer', '/escolacidada/cemeit');
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
            <AdminDashboard
              onNavigateToSignerToken={(token) => navigateToSigner(token)}
              onNavigateToValidatorHash={(hash) => navigateToValidator(hash)}
            />
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
