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
  Trash2
} from 'lucide-react';
import { apiClient } from '../../lib/api.ts';

interface AdminDashboardProps {
  onNavigateToSignerToken: (token: string) => void;
  onNavigateToValidatorHash: (hash: string) => void;
}

// mockAuthorizations removido

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToSignerToken,
  onNavigateToValidatorHash,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedGlobal, setCopiedGlobal] = useState(false);
  const [authorizations, setAuthorizations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const resDocs = await apiClient.getAdminDocuments();
      const resLogs = await apiClient.getAdminAuditLogs();
      
      if (resDocs.success && resLogs.success) {
        // Mostra apenas os assinados
        const signedDocs = resDocs.documents.filter((d: any) => d.status === 'signed');
        const auths = signedDocs.map((doc: any) => {
          const log = resLogs.logs.find((l: any) => l.document_id === doc.id);
          return {
            id: doc.id,
            studentName: doc.minor_name,
            activity: doc.template_title,
            status: doc.status,
            dateSent: new Date(doc.created_at).toLocaleDateString('pt-BR'),
            hash: log?.manifest_sha256
          };
        });
        setAuthorizations(auths);
      }
    };
    fetchData();
  }, []);

  const globalLinkToken = 'projeto-escola-cidada-2026';

  const handleCopyGlobalLink = () => {
    const link = `${window.location.origin}/signer?token=${globalLinkToken}`;
    navigator.clipboard.writeText(link);
    setCopiedGlobal(true);
    setTimeout(() => setCopiedGlobal(false), 2000);
  };

  const filteredAuths = authorizations.filter(
    (auth) =>
      auth.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearData = () => {
    if (confirm('Tem certeza que deseja apagar todos os dados armazenados localmente? Isso simula um reset na base de dados.')) {
      localStorage.clear();
      window.location.reload();
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
            Acompanhamento em tempo real das autorizações de saúde e LGPD da campanha "Saúde em Movimento".
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button 
            onClick={() => onNavigateToSignerToken(globalLinkToken)}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
            title="Abrir o link público para visualizar como o responsável"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Simular Formulário</span>
          </button>

          <button 
            onClick={handleCopyGlobalLink}
            className={`px-4 py-2.5 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors ${
              copiedGlobal 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700' 
                : 'bg-sesi-primary hover:bg-blue-800 text-white border border-sesi-primary'
            }`}
          >
            {copiedGlobal ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedGlobal ? 'Link Copiado!' : 'Copiar Link Público'}</span>
          </button>

        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros (Clean) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do aluno ou projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Assinaturas</span>
            <span className="text-sm font-bold text-slate-800 leading-none">{filteredAuths.length} validadas</span>
          </div>
        </div>
      </div>

      {/* Tabela de Autorizações (Corporate Table) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">Paciente / Aluno</th>
                <th className="px-6 py-4">Projeto e Termo</th>
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
                      <span className="text-sm font-medium text-slate-600">
                        {auth.activity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
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
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 hover:text-sesi-primary text-slate-600 text-xs font-semibold shadow-sm transition-colors"
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
                      <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhuma assinatura</h3>
                      <p className="text-xs text-slate-500">
                        Nenhuma autorização corresponde à sua busca no momento.
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
  );
};
