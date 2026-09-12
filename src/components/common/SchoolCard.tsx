import React from 'react';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import type { Institution } from '../../lib/types.ts';

export interface SchoolCardProps {
  institution: Institution;
  onSelect: (slug: string) => void;
}

/**
 * Card representativo de uma unidade escolar participante.
 * Princípio SOLID: Responsabilidade Única (SRP) e acessibilidade WCAG (teclado e foco).
 */
export const SchoolCard: React.FC<SchoolCardProps> = ({ institution, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(institution.id)}
      className="group bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#004b8d] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(institution.id);
        }
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#004b8d] flex items-center justify-center font-bold text-xs group-hover:bg-[#004b8d] group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-100/80 text-slate-800 group-hover:text-blue-950 font-mono text-xs font-bold transition-colors">
              {institution.short_name || institution.id.toUpperCase()}
            </span>
          </div>

          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            <MapPin className="w-3 h-3 text-slate-400" />
            {institution.city} - {institution.state}
          </span>
        </div>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#004b8d] transition-colors leading-snug">
            {institution.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">Link direto: /autorizar/{institution.id}</p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#004b8d]">
        <span>Acessar termo de autorização</span>
        <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-[#004b8d] text-[#004b8d] group-hover:text-white flex items-center justify-center transition-all">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
