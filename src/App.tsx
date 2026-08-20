import { useState } from 'react';
import { Header } from './components/common/Header.tsx';
import { SignerWizard } from './components/signer/SignerWizard.tsx';
import { PublicValidator } from './components/validator/PublicValidator.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { RevocationPortal } from './components/revocation/RevocationPortal.tsx';

export function App() {
  const [currentView, setCurrentView] = useState<'signer' | 'validator' | 'admin' | 'revoke'>('admin');
  const [activeSignerToken, setActiveSignerToken] = useState('demo-token-sesi-audiometria-2026');
  const [activeValidatorHash, setActiveValidatorHash] = useState('');

  const navigateToSigner = (token?: string) => {
    if (token) setActiveSignerToken(token);
    setCurrentView('signer');
  };

  const navigateToValidator = (hash?: string) => {
    if (hash) setActiveValidatorHash(hash);
    setCurrentView('validator');
  };

  const navigateToRevoke = (token?: string) => {
    if (token) setActiveSignerToken(token);
    setCurrentView('revoke');
  };

  const isPublicView = currentView === 'signer' || currentView === 'validator' || currentView === 'revoke';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Superior - Oculto para pais (visão pública) */}
      {!isPublicView && (
        <Header currentView={currentView} onNavigate={(v) => setCurrentView(v as any)} />
      )}

      {/* Conteúdo Principal */}
      <main className={`flex-1 flex flex-col w-full ${isPublicView ? 'items-center pt-12' : ''}`}>
        
        {/* Logo minimalista para as telas públicas (pais) */}
        {isPublicView && (
          <div className="mb-10 flex flex-col items-center justify-center">
            <img 
              src="https://sesitocantins.com.br/wp-content/uploads/2025/08/SESI-SAUDE-28-e1755405422745-1024x595.png" 
              alt="Logo SESI Saúde" 
              className="h-12 w-auto object-contain"
            />
          </div>
        )}

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
            <PublicValidator initialHash={activeValidatorHash} onNavigateToSigner={() => setCurrentView('signer')} />
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
              onBack={() => setCurrentView('signer')}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
