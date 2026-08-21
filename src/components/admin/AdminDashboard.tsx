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
  LogOut,
  FileSpreadsheet,
  Archive,
  Camera,
  Calendar,
  Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import { GeradorPdfTermoSesi } from '../../lib/pades/GeradorPdfTermoSesi.ts';
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
  const [selectedImageOption, setSelectedImageOption] = useState<'all' | 'authorized' | 'not_authorized'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [isExportingZip, setIsExportingZip] = useState(false);
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

          // Verifica se a imagem foi autorizada no registro
          const authImageGranted = doc.auth_image !== 'no' && doc.auth_image !== false;

          return {
            id: doc.id,
            studentName: doc.minor_name || 'Estudante',
            birthDate: doc.minor_birth_date || '',
            parentName: doc.parent_name || log?.signer_name || 'Responsável Legal',
            parentCpfMasked: log?.signer_cpf_masked || '***.***.***-**',
            relationship: log?.signer_relationship || 'Responsável Legal',
            activity: doc.template_title || 'Escola Cidadã — Saúde em Movimento',
            institutionId: instMatch ? instMatch.id : (doc.institution_id || 'cemeit'),
            institutionName: instMatch ? instMatch.short_name : (doc.institution_name || 'CEMEIT'),
            status: doc.status,
            authHealth: true,
            authData: true,
            authImage: authImageGranted,
            dateSent: new Date(doc.created_at).toLocaleDateString('pt-BR'),
            signedAtDate: new Date(doc.created_at),
            hash: log?.manifest_sha256 || doc.content_sha256,
            validationCode: log?.manifest_sha256
              ? `SESI-${log.manifest_sha256.substring(0, 4).toUpperCase()}-${log.manifest_sha256.substring(log.manifest_sha256.length - 4).toUpperCase()}`
              : (doc.id ? `SESI-${doc.id.substring(0, 4).toUpperCase()}` : 'SESI-VALID'),
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
      auth.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (auth.validationCode && auth.validationCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesInstitution =
      selectedInstitution === 'all' ||
      auth.institutionId === selectedInstitution ||
      (auth.institutionName && auth.institutionName.toLowerCase().includes(selectedInstitution.toLowerCase()));

    const matchesImage =
      selectedImageOption === 'all' ||
      (selectedImageOption === 'authorized' && auth.authImage === true) ||
      (selectedImageOption === 'not_authorized' && auth.authImage === false);

    let matchesDate = true;
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const authDate = new Date(auth.signedAtDate);
      const diffTime = Math.abs(now.getTime() - authDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (selectedDateRange === 'today') {
        matchesDate = now.toDateString() === authDate.toDateString();
      } else if (selectedDateRange === '7days') {
        matchesDate = diffDays <= 7;
      } else if (selectedDateRange === '30days') {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesInstitution && matchesImage && matchesDate;
  });

  const totalImageAuthorized = filteredAuths.filter((a) => a.authImage).length;

  /**
   * Exporta a lista consolidada de autorizações em formato CSV compatível com Excel (BOM UTF-8)
   */
  const handleExportCsv = () => {
    if (filteredAuths.length === 0) {
      alert('Nenhuma autorização disponível para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'Código Validação',
      'Estudante / Aluno',
      'Data Nascimento',
      'Instituição / Escola',
      'Responsável Legal',
      'CPF Responsável',
      'Parentesco / Vínculo',
      'Atendimento de Saúde',
      'Tratamento de Dados (LGPD)',
      'Uso de Imagem e Voz',
      'Data da Assinatura',
      'Hash do Manifesto (SHA-256)'
    ];

    const rows = filteredAuths.map((a) => [
      `"${a.validationCode || a.id}"`,
      `"${a.studentName}"`,
      `"${a.birthDate || ''}"`,
      `"${a.institutionName}"`,
      `"${a.parentName}"`,
      `"${a.parentCpfMasked}"`,
      `"${a.relationship}"`,
      `"AUTORIZADO"`,
      `"AUTORIZADO"`,
      `"${a.authImage ? 'AUTORIZADO (SIM)' : 'NÃO AUTORIZADO'}"`,
      `"${a.dateSent}"`,
      `"${a.hash || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_autorizacoes_sesi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Empacota e baixa todos os PDFs das autorizações filtradas em um arquivo ZIP
   */
  const handleExportZipPdfs = async () => {
    if (filteredAuths.length === 0) {
      alert('Nenhuma autorização disponível para baixar em ZIP.');
      return;
    }

    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('autorizacoes_assinadas_sesi');

      for (let i = 0; i < filteredAuths.length; i++) {
        const auth = filteredAuths[i];
        const pdfBytes = await GeradorPdfTermoSesi.gerarPdfOriginal({
          tituloProcedimento: auth.activity,
          descricaoProcedimento: 'Autorização e Consentimento para Atendimento em Saúde e Exames Clínicos — Escola Cidadã — Saúde em Movimento.',
          nomeMenor: auth.studentName,
          dataNascimentoMenor: auth.birthDate || '2010-01-01',
          nomeResponsavel: auth.parentName,
          cpfResponsavelMascarado: auth.parentCpfMasked,
          parentesco: auth.relationship,
          autorizacaoSaude: true,
          autorizacaoDados: true,
          autorizacaoImagem: auth.authImage,
          hashManifesto: auth.hash,
          dataAssinatura: auth.signedAtDate,
          tipoAssinatura: 'ELETRONICA_AVANCADA',
        });

        const sanitizedName = auth.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${auth.validationCode}_${sanitizedName}.pdf`;
        folder?.file(fileName, pdfBytes);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `autorizacoes_sesi_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Erro ao gerar arquivo ZIP: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

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
          
          {/* Caixa de Pesquisa e Filtros Avançados */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
            
            {/* Linha 1: Barra de Busca + Dropdowns de Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Input de Busca */}
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar aluno, responsável ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all"
                />
              </div>

              {/* Filtro: Escola */}
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none"
                >
                  <option value="all">Todas as Escolas</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.short_name} - {inst.city}/{inst.state}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro: Uso de Imagem */}
              <div className="relative">
                <Camera className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedImageOption}
                  onChange={(e) => setSelectedImageOption(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none"
                >
                  <option value="all">Imagem: Todas as Opções</option>
                  <option value="authorized">📸 Imagem: Apenas Autorizada (Sim)</option>
                  <option value="not_authorized">🚫 Imagem: Não Autorizada (Não)</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Filtro: Período */}
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-sesi-primary focus:bg-white focus:ring-1 focus:ring-sesi-primary transition-all cursor-pointer appearance-none"
                >
                  <option value="all">Período: Todo o Histórico</option>
                  <option value="today">📅 Assinadas Hoje</option>
                  <option value="7days">📅 Últimos 7 dias</option>
                  <option value="30days">📅 Últimos 30 dias</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

            </div>

            {/* Linha 2: Resumo Métrico + Botões de Exportação Consolidada */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Badges de Contagem */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-sesi-primary font-bold rounded-lg border border-blue-100">
                  <Users className="w-3.5 h-3.5" />
                  <span>{filteredAuths.length} autorizações encontradas</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-100">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{totalImageAuthorized} com imagem autorizada</span>
                </span>
              </div>

              {/* Botões de Ação: Excel / CSV e ZIP de PDFs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  title="Exportar dados consolidados em planilha Excel/CSV"
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar Excel / CSV</span>
                </button>

                <button
                  onClick={handleExportZipPdfs}
                  disabled={isExportingZip || filteredAuths.length === 0}
                  title="Baixar todos os termos assinados filtrados em um arquivo ZIP"
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 text-blue-300" />
                      <span>Baixar ZIP de PDFs</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* Tabela de Autorizações */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Paciente / Aluno</th>
                    <th className="px-6 py-4">Responsável Legal</th>
                    <th className="px-6 py-4">Instituição / Escola</th>
                    <th className="px-6 py-4">Data Assinatura</th>
                    <th className="px-6 py-4">Autorizações LGPD</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuths.length > 0 ? (
                    filteredAuths.map((auth) => (
                      <tr 
                        key={auth.id} 
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-sm text-slate-800">{auth.studentName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{auth.validationCode || auth.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-700 font-medium">
                            <span className="font-bold">{auth.parentName}</span>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{auth.parentCpfMasked} ({auth.relationship})</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {auth.institutionName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600 font-medium">
                            {auth.dateSent}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Saúde & Dados: Sim
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${auth.authImage ? 'text-blue-700' : 'text-slate-500'}`}>
                              <Camera className="w-3 h-3" />
                              Imagem: {auth.authImage ? 'Autorizada (Sim)' : 'Não Autorizada'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onNavigateToValidatorHash(auth.hash!)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-sesi-primary hover:border-blue-200 text-slate-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> 
                            <span>Ver Detalhes</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-slate-300 mb-3" />
                          <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhuma autorização encontrada</h3>
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
