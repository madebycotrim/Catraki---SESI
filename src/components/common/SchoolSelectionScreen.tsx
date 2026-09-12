import React, { useState, useEffect } from 'react';
import { 
  Search, 
  School, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  FileCheck2, 
  Building2, 
  Lock, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { Institution } from '../../lib/types.ts';

interface SchoolSelectionScreenProps {
  onSelectSchool: (slug: string) => void;
  onNavigateToValidator: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToTerms: () => void;
}

export const SchoolSelectionScreen: React.FC<SchoolSelectionScreenProps> = ({
  onSelectSchool,
  onNavigateToValidator,
  onNavigateToAdmin,
  onNavigateToPrivacy,
  onNavigateToTerms,
}) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchSchools = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.getPublicInstitutions();
        if (isMounted) {
          if (res.success && Array.isArray(res.institutions)) {
            setInstitutions(res.institutions);
          } else {
            setError('Não foi possível listar as escolas participantes no momento.');
          }
        }
      } catch {
        if (isMounted) {
          setError('Erro de conexão ao carregar as unidades escolares.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSchools();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inst.name.toLowerCase().includes(term) ||
      inst.short_name.toLowerCase().includes(term) ||
      inst.city.toLowerCase().includes(term) ||
      inst.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 animate-in fade-in duration-300">
      
      {/* Cabeçalho Principal do Portal */}
      <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-sesi-primary text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#004b8d]" />
          <span>Projeto Escola Cidadã: Saúde em Movimento</span>
        </div>

        <div className="flex justify-center items-center gap-3 pt-1">
          <img 
            src="/catraki.png" 
            alt="Catraki" 
            className="h-10 sm:h-12 w-auto object-contain rounded drop-shadow-xs" 
          />
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
          Portal de Autorização Digital Escolar
        </h1>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
          Selecione a sua <strong>unidade escolar</strong> para acessar o formulário oficial de consentimento e assinatura eletrônica para os atendimentos de saúde gratuitos.
        </p>
      </div>

      {/* Caixa de Busca com Filtro Rápido */}
      <div className="mb-6 sm:mb-8">
        <div className="relative max-w-xl mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar escola por nome, sigla ou região (ex: CEMEIT, Taguatinga)..."
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-300 focus:border-[#004b8d] focus:ring-2 focus:ring-blue-100 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Estado de Carregamento */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#004b8d]" />
          <p className="text-xs sm:text-sm font-medium">Carregando escolas participantes...</p>
        </div>
      )}

      {/* Estado de Erro */}
      {!loading && error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start gap-3.5 max-w-xl mx-auto shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Aviso</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Grid de Escolas Participantes */}
      {!loading && !error && (
        <>
          {filteredInstitutions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <School className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Nenhuma escola encontrada</h3>
              <p className="text-xs text-slate-500 mt-1">
                Não encontramos nenhuma unidade com o termo "{searchTerm}". Verifique o nome ou limpe a busca.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInstitutions.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => onSelectSchool(inst.id)}
                  className="group bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#004b8d] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSchool(inst.id);
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
                          {inst.short_name || inst.id.toUpperCase()}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {inst.city} - {inst.state}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#004b8d] transition-colors leading-snug">
                        {inst.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Link direto: /autorizar/{inst.id}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#004b8d]">
                    <span>Acessar termo de autorização</span>
                    <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-[#004b8d] text-[#004b8d] group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Seção Secundária: Validador de Autenticidade */}
      <div className="mt-8 sm:mt-10 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Já preencheu ou assinou uma autorização?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Consulte o status ou valide a autenticidade jurídica do comprovante com o código verificador do termo.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToValidator}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Validar Comprovante</span>
          </button>
        </div>
      </div>

      {/* Rodapé Institucional com Conformidade Legal */}
      <footer className="mt-10 pt-6 border-t border-slate-200/80 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <button
            onClick={onNavigateToTerms}
            className="hover:text-slate-800 hover:underline cursor-pointer transition-colors"
          >
            Termos de Uso
          </button>
          <span>•</span>
          <button
            onClick={onNavigateToPrivacy}
            className="hover:text-slate-800 hover:underline cursor-pointer transition-colors"
          >
            Política de Privacidade (LGPD)
          </button>
          <span>•</span>
          <button
            onClick={onNavigateToAdmin}
            className="hover:text-slate-800 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Lock className="w-3 h-3" />
            <span>Acesso Administrativo</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 max-w-xl mx-auto leading-relaxed">
          Plataforma Catraki • Sistema Oficial de Assinatura Eletrônica do Projeto Escola Cidadã: Saúde em Movimento (SESI-DF, Universidade de Brasília e FINATEC). Em conformidade com a MP 2.200-2/2001, Lei 14.063/2020 e LGPD.
        </p>
      </footer>

    </div>
  );
};
