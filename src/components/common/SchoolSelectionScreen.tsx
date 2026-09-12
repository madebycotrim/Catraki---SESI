import React from 'react';
import {
  Search,
  School,
  ShieldCheck,
  FileCheck2,
  Lock,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useSchoolList } from '../../hooks/useSchoolList.ts';
import { SchoolCard } from './SchoolCard.tsx';

interface SchoolSelectionScreenProps {
  onSelectSchool: (slug: string) => void;
  onNavigateToValidator: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToTerms: () => void;
}

/**
 * Tela principal de seleção de unidades escolares participantes.
 * Princípio SOLID: Foco exclusivo na apresentação visual (SRP), delegando a busca
 * e filtragem ao hook useSchoolList e a renderização de cada escola ao componente SchoolCard.
 */
export const SchoolSelectionScreen: React.FC<SchoolSelectionScreenProps> = ({
  onSelectSchool,
  onNavigateToValidator,
  onNavigateToAdmin,
  onNavigateToPrivacy,
  onNavigateToTerms,
}) => {
  const {
    filteredInstitutions,
    loading,
    error,
    searchTerm,
    setSearchTerm,
  } = useSchoolList();

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 animate-in fade-in duration-300">
      {/* Cabeçalho Principal do Portal */}
      <header className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10">
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
          Portal de Autorização Eletrônica
        </h1>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
          Selecione a sua <strong>unidade escolar</strong> para acessar o formulário oficial de
          consentimento e assinatura eletrônica simples para os atendimentos de saúde gratuitos.
        </p>
      </header>

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
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Nenhuma escola encontrada
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Não encontramos nenhuma unidade com o termo &quot;{searchTerm}&quot;. Verifique o
                nome ou limpe a busca.
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
                <SchoolCard key={inst.id} institution={inst} onSelect={onSelectSchool} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Seção Secundária: Validador de Autenticidade */}
      <section className="mt-8 sm:mt-10 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md">
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
                Consulte o status ou valide a autenticidade jurídica do comprovante com o código
                verificador do termo.
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
      </section>

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
          Plataforma Catraki • Sistema Oficial de Assinatura Eletrônica do Projeto Escola Cidadã:
          Saúde em Movimento (SESI-DF e Universidade de Brasília). Em conformidade com a MP
          2.200-2/2001, Lei 14.063/2020 e LGPD.
        </p>
      </footer>
    </div>
  );
};
