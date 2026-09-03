import React from 'react';
import { ShieldCheck, CheckCircle2, FileText, Sparkles } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-400 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
        {/* Coluna 1: Tecnologia e Autenticidade */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>Assinatura Digital e Segurança</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            O Catraki é a ferramenta tecnológica que facilita a assinatura de autorizações escolares com autenticação em duas etapas por e-mail e comprovante verificável.
          </p>
          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/40 text-[11px] text-blue-300/90 leading-relaxed">
            <strong>Conferência Pública:</strong> Qualquer comprovante gerado pode ser consultado a qualquer momento pelo código único ou QR Code na página de validação.
          </div>
        </div>

        {/* Coluna 2: Proteção e Cuidado */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Privacidade das Famílias</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            As informações preenchidas são usadas exclusivamente para a organização dos atendimentos escolares. Seus dados nunca serão comercializados.
          </p>
          <ul className="space-y-1 text-[11px] text-slate-400">
            <li>• Conexão segura protegida por criptografia de ponta a ponta</li>
            <li>• Código de segurança individual por e-mail</li>
            <li>• Acesso restrito e sem uso para fins comerciais</li>
          </ul>
        </div>

        {/* Coluna 3: Projeto e Suporte */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Projeto Escola Cidadã</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            Ações de saúde preventiva nas escolas realizadas em cooperação pelo <strong>SESI-DF</strong> e pela <strong>Universidade de Brasília (FS/UnB)</strong>.
          </p>
          <button
            onClick={() => onNavigate('lgpd')}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Consultar meus dados ou solicitar atendimento</span>
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Suporte técnico: <a href="mailto:suporte@catraki.com.br" className="text-slate-400 underline hover:text-white">suporte@catraki.com.br</a>
          </p>
        </div>
      </div>

      {/* Isenção e Governança Tecnológica */}
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900 text-[11px] text-slate-500 leading-relaxed text-center sm:text-left space-y-3">
        <p className="m-0 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-slate-400">
          <strong>Organização do Projeto:</strong> Os atendimentos clínicos e triagens são realizados e geridos pelas equipes de saúde do <strong>SESI-DF</strong> e da <strong>Faculdade de Ciências da Saúde da UnB</strong>. O Catraki atua estritamente como a plataforma de software para emissão e validação das autorizações digitais.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div>
            © {new Date().getFullYear()} Catraki • Tecnologia em Assinaturas Digitais Escolares.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('privacy')}
              className="hover:text-slate-300 transition-colors underline cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('terms')}
              className="hover:text-slate-300 transition-colors underline cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Ambiente Seguro
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
