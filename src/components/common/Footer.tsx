import React from 'react';
import { ShieldCheck, Scale, FileText, Lock } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-400 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
        {/* Coluna 1: Enquadramento Jurídico */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Scale className="w-4 h-4 text-blue-400" />
            <span>Conformidade Jurídica & Regulatória</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            Sistema desenvolvido em estrita conformidade com a <strong>MP 2.200-2/2001 (Art. 10, § 2º)</strong>, <strong>Lei Federal nº 14.063/2020</strong> (Assinatura Eletrônica), <strong>Marco Civil da Internet (Lei 12.965/2014)</strong> e <strong>Art. 299 do Código Penal</strong>.
          </p>
          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/40 text-[11px] text-blue-300/90 leading-relaxed">
            <strong>Aviso de Validade:</strong> As assinaturas geradas nesta plataforma constituem assinaturas eletrônicas válidas mediante envio de código de segurança por e-mail, declaração de responsabilidade e registro de integridade, nos termos do Art. 10, § 2º da MP 2.200-2/2001 e Lei 14.063/2020, sem necessidade de certificado ICP-Brasil.
          </div>
        </div>

        {/* Coluna 2: Proteção de Dados de Menores (LGPD) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Privacidade & Dados de Saúde (LGPD)</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            O tratamento de dados sensíveis de saúde de crianças e adolescentes é fundamentado no <strong>Art. 11, I c/c Art. 14, §1º da LGPD (Lei 13.709/2018)</strong>, com consentimento específico, individualizado por procedimento e assinado exclusivamente pelo representante legal.
          </p>
          <ul className="space-y-1 text-[11px] text-slate-400">
            <li>• Conexão segura e armazenamento protegido</li>
            <li>• Registro cronológico de auditoria</li>
            <li>• Política de retenção para fins clínicos</li>
          </ul>
        </div>

        {/* Coluna 3: Direitos do Titular & Suporte */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Canal do Titular / DPO</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            Para exercer seus direitos de acesso, correção, eliminação de dados ou revogação de consentimento (Art. 18 LGPD):
          </p>
          <button
            onClick={() => onNavigate('lgpd')}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Acessar Portal do Titular (Art. 18 LGPD)</span>
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            SESI — Serviço Social da Indústria • Departamento Regional
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <div>
          © {new Date().getFullYear()} Catraki. Todos os direitos reservados. Plataforma tecnológica operada por Catraki.
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Trilha de Auditoria Ativa
          </span>
          <span>•</span>
          <span>Registro Cronológico Digital</span>
        </div>
      </div>
    </footer>
  );
};
