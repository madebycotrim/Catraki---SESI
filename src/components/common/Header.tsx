import React from 'react';
import { 
  LayoutDashboard, 
  FileCheck, 
  FileText
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Oficial SESI SAUDE */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => onNavigate('admin')}
          >
            <img 
              src="https://sesitocantins.com.br/wp-content/uploads/2025/08/SESI-SAUDE-28-e1755405422745-1024x595.png" 
              alt="Logo SESI Saúde" 
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Nav Links (Design Sóbrio) */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 ${
                currentView === 'admin'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel Gestor</span>
            </button>
            
            <button
              onClick={() => onNavigate('signer')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 ${
                currentView === 'signer' || currentView === 'revoke'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Assinatura Digital</span>
            </button>

            <button
              onClick={() => onNavigate('validator')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 ${
                currentView === 'validator'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Validador Oficial</span>
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
