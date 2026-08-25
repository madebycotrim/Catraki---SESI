import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileCheck, 
  FileText,
  Menu,
  X
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Oficial CATRAKI */}
          <div 
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
            onClick={() => handleNavClick('admin')}
          >
            <img 
              src="/catraki.png" 
              alt="Logo Catraki" 
              className="h-8 sm:h-9 w-auto object-contain rounded"
            />
          </div>

          {/* Nav Links Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNavClick('admin')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 cursor-pointer ${
                currentView === 'admin'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel Gestor</span>
            </button>
            
            <button
              onClick={() => handleNavClick('signer')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 cursor-pointer ${
                currentView === 'signer' || currentView === 'revoke'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Assinatura Eletrônica</span>
            </button>

            <button
              onClick={() => handleNavClick('validator')}
              className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 cursor-pointer ${
                currentView === 'validator'
                  ? 'border-sesi-primary text-sesi-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Validador Público</span>
            </button>
          </nav>

          {/* Botão Menu Hambúrguer (Mobile) */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menu Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => handleNavClick('admin')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
              currentView === 'admin'
                ? 'bg-blue-50 text-sesi-primary'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-sesi-primary" />
            <span>Painel Gestor</span>
          </button>

          <button
            onClick={() => handleNavClick('signer')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
              currentView === 'signer' || currentView === 'revoke'
                ? 'bg-blue-50 text-sesi-primary'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4 text-sesi-primary" />
            <span>Assinatura Eletrônica</span>
          </button>

          <button
            onClick={() => handleNavClick('validator')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
              currentView === 'validator'
                ? 'bg-blue-50 text-sesi-primary'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-sesi-primary" />
            <span>Validador Público</span>
          </button>
        </div>
      )}
    </header>
  );
};

