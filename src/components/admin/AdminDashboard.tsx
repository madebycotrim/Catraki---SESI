import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  Users,
  AlertTriangle,
  Check,
  Building2,
  Plus,
  Trash2,
  Link as LinkIcon,
  LogOut
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { Institution } from '../../lib/types.ts';

interface AdminDashboardProps {
  onNavigateToSignerToken: (token: string, schoolSlug?: string) => void;
  onNavigateToValidatorHash: (hash: string) => void;
  currentUser?: any;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToSignerToken,
  onNavigateToValidatorHash,
  currentUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'authorizations' | 'schools'>('authorizations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showNewSchoolModal, setShowNewSchoolModal] = useState(false);

  // Formulário de nova escola
  const [newSchoolData, setNewSchoolData] = useState({
    id: '',
    name: '',
    short_name: '',
    city: 'Taguatinga',
    state: 'DF',
  });
  const [schoolFormError, setSchoolFormError] = useState('');

  const fetchInstitutions = async () => {
    const res = await apiClient.getAdminInstitutions();
    if (res.success && res.institutions) {
      setInstitutions(res.institutions);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const resDocs = await apiClient.getAdminDocuments();
      const resLogs = await apiClient.getAdminAuditLogs();
      const resInst = await apiClient.getAdminInstitutions();
      
      const instList = resInst.success && resInst.institutions ? resInst.institutions : [];

      if (resDocs.success && resLogs.success) {
        const signedDocs = resDocs.documents.filter((d: any) => d.status === 'signed');
        const auths = signedDocs.map((doc: any) => {
          const log = resLogs.logs.find((l: any) => l.document_id === doc.id);
          const instMatch = instList.find((i: any) => 
            i.id === doc.institution_id || 
            (doc.access_token && doc.access_token.toLowerCase().includes(i.id))
          );

          return {
            id: doc.id,
            studentName: doc.minor_name,
            activity: doc.template_title || 'Projeto Escola Cidadã: Saúde em Movimento',
            institutionId: instMatch ? instMatch.id : (doc.institution_id || 'cemeit'),
            institutionName: instMatch ? instMatch.short_name : 'CEMEIT',
            status: doc.status,
            dateSent: new Date(doc.created_at).toLocaleDateString('pt-BR'),
            hash: log?.manifest_sha256
          };
        });
        setAuthorizations(auths);
      }
    };
    fetchData();
    fetchInstitutions();
  }, []);

  const handleCopySchoolLink = (slug: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/autorizar/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolFormError('');
    if (!newSchoolData.name.trim() || !newSchoolData.short_name.trim()) {
      setSchoolFormError('Nome completo e sigla da escola são obrigatórios.');
      return;
    }

    const generatedSlug = (newSchoolData.id || newSchoolData.short_name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-');

    const res = await apiClient.createAdminInstitution({
      ...newSchoolData,
      id: generatedSlug,
    });

    if (res.success) {
      setShowNewSchoolModal(false);
      setNewSchoolData({
        id: '',
        name: '',
        short_name: '',
        city: 'Taguatinga',
        state: 'DF',
      });
      fetchInstitutions();
    } else {
      setSchoolFormError(res.error || 'Erro ao cadastrar escola.');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (confirm('Deseja realmente remover esta instituição do catálogo de rotas?')) {
      await apiClient.deleteAdminInstitution(id);
      fetchInstitutions();
    }
  };

  const filteredAuths = authorizations.filter((auth) => {
    const matchesSearch =
      auth.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInstitution =
      selectedInstitution === 'all' ||
      auth.institutionId === selectedInstitution ||
      (auth.institutionName && auth.institutionName.toLowerCase().includes(selectedInstitution.toLowerCase()));

    return matchesSearch && matchesInstitution;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Corporativo */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold tracking-widest uppercase mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            SISTEMA SESI SAÚDE ATIVO
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Painel Gestor
          </h1>
          <p className="text-slate-500 mt-1 text-sm max-w-xl">
            Acompanhamento de autorizações e gestão de escolas participantes da campanha "Saúde em Movimento".
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 relative z-10">
          {/* Card do Usuário Logado */}
          {currentUser && (
            <div className="flex items-center gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-sesi-primary text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-slate-800 leading-tight flex items-center gap-2">
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">{currentUser.name}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-sesi-primary text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0">
                    {currentUser.role === 'admin_master' ? 'Master' : 'Gestor'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5 truncate">{currentUser.email}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNewSchoolModal(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Escola</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sair do Painel Gestor"
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('authorizations')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'authorizations'
              ? 'border-sesi-primary text-sesi-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Autorizações Assinadas ({filteredAuths.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'schools'
              ? 'border-sesi-primary text-sesi-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Escolas & Links de Acesso ({institutions.length})</span>
        </button>
      </div>

      {/* ABA 1: AUTORIZAÇÕES ASSINADAS */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">
          {/* Caixa de Pesquisa e Filtros (Com Select de Instituições) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Input de Busca */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome do aluno ou código do documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-all"
              />
            </div>

            {/* Select Dropdown com as Instituições */}
            <div className="relative min-w-[260px]">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none"
              >
                <option value="all">Todas as Instituições / Escolas</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.short_name} - {inst.city}/{inst.state}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
            
            {/* Contador de Assinaturas */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Assinaturas</span>
                <span className="text-sm font-bold text-slate-800 leading-none">{filteredAuths.length} validadas</span>
              </div>
            </div>
          </div>

          {/* Tabela de Autorizações */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Paciente / Aluno</th>
                    <th className="px-6 py-4">Instituição / Escola</th>
                    <th className="px-6 py-4">Data da Assinatura</th>
                    <th className="px-6 py-4">Status Legais</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuths.length > 0 ? (
                    filteredAuths.map((auth) => (
                      <tr 
                        key={auth.id} 
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-sm text-slate-800">{auth.studentName}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{auth.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {auth.institutionName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 font-medium">
                            {auth.dateSent}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 
                            Assinado (LGPD)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onNavigateToValidatorHash(auth.hash!)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 hover:text-sesi-primary text-slate-600 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> 
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-slate-300 mb-3" />
                          <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhuma assinatura encontrada</h3>
                          <p className="text-xs text-slate-500">
                            Nenhuma autorização corresponde aos filtros selecionados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE ESCOLAS & INSTITUIÇÕES */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-sesi-primary shrink-0 mt-0.5" />
            <div>
              <strong>Como funciona o roteamento por escola:</strong> Qualquer link no formato <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-blue-950 font-bold">/autorizar/[slug-da-escola]</code> carrega o termo de consentimento personalizado com o nome daquela instituição de ensino. Basta cadastrar a escola abaixo e copiar o link para enviar aos pais!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutions.map((inst) => {
              const isCopied = copiedSlug === inst.id;
              const directUrl = `${window.location.origin}/autorizar/${inst.id}`;

              return (
                <div 
                  key={inst.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                          /{inst.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {inst.city} - {inst.state}
                        </span>
                      </div>
                      {inst.id !== 'cemeit' && (
                        <button
                          onClick={() => handleDeleteSchool(inst.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Desativar escola"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono break-all bg-slate-50 p-2 rounded border border-slate-100">
                      {directUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopySchoolLink(inst.id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isCopied 
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : 'bg-sesi-primary hover:bg-blue-800 text-white'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Link Copiado!' : 'Copiar Link dos Pais'}</span>
                    </button>

                    <button
                      onClick={() => onNavigateToSignerToken('projeto-escola-cidada-2026', inst.id)}
                      className="py-2 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Abrir formulário desta escola"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Abrir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA ESCOLA */}
      {showNewSchoolModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-sesi-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Cadastrar Nova Escola</h2>
                  <p className="text-xs text-slate-500">Crie um link exclusivo para uma instituição</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewSchoolModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {schoolFormError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {schoolFormError}
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Nome Completo da Escola <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Centro Educacional 03 de Sobradinho"
                  value={newSchoolData.name}
                  onChange={(e) => setNewSchoolData({ ...newSchoolData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Sigla / Nome Curto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CED 03 Sobradinho"
                    value={newSchoolData.short_name}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, short_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Slug da URL (Identificador)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ced03 (opcional)"
                    value={newSchoolData.id}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-sesi-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Sobradinho"
                    value={newSchoolData.city}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="DF"
                    value={newSchoolData.state}
                    onChange={(e) => setNewSchoolData({ ...newSchoolData, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSchoolModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-sesi-primary hover:bg-blue-800 text-white rounded-lg transition-colors shadow-sm"
                >
                  Salvar Escola e Gerar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
