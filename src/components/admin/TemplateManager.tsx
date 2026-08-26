import React, { useState, useEffect } from 'react';
import { Layers, Plus, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { DocumentTemplate } from '../../lib/types.ts';

export const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);

  // Formulário de Novo Template
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [procedureDescription, setProcedureDescription] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [retentionDays, setRetentionDays] = useState(1825);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const resp = await apiClient.getAdminTemplates();
    if (resp.success) {
      setTemplates(resp.templates);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      const resp = await apiClient.createAdminTemplate({
        id,
        title,
        procedure_description: procedureDescription,
        content_markdown: contentMarkdown,
        retention_days: retentionDays,
      });

      if (resp.success) {
        setSuccessMessage(resp.message || 'Template versionado com sucesso.');
        setShowNewModal(false);
        // Limpa form
        setId('');
        setTitle('');
        setProcedureDescription('');
        setContentMarkdown('');
        loadTemplates();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Templates de Procedimento de Consentimento (Versionados)
          </h2>
          <p className="text-xs text-slate-400">
            Cada procedimento possui descrição específica e prazo de retenção alinhado ao resguardo legal de consentimentos (LGPD Art. 11/14).
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Template de Procedimento</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Lista de Templates Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tmpl) => (
          <div key={`${tmpl.id}-v${tmpl.version}`} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                v{tmpl.version} • {tmpl.id}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Retenção: {Math.round(tmpl.retention_days / 365)} anos ({tmpl.retention_days} dias)
              </span>
            </div>

            <h3 className="text-sm font-bold text-white">{tmpl.title}</h3>
            
            <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
              <strong>Escopo de Atendimento:</strong> {tmpl.procedure_description}
            </p>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="truncate max-w-[200px]" title={tmpl.content_sha256}>
                SHA-256: {tmpl.content_sha256.substring(0, 16)}...
              </span>
              <span className="text-emerald-400">Ativo para Emissão</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação de Novo Template */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Criar / Versionar Template de Consentimento</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tpl-slug" className="block font-semibold text-slate-300 mb-1">Identificador Único (Slug):</label>
                  <input
                    id="tpl-slug"
                    name="templateSlug"
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="ex: proc_espirometria_infantil"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="tpl-retention" className="block font-semibold text-slate-300 mb-1">Prazo de Retenção (Dias):</label>
                  <input
                    id="tpl-retention"
                    name="retentionDays"
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tpl-title" className="block font-semibold text-slate-300 mb-1">Título Oficial do Procedimento:</label>
                <input
                  id="tpl-title"
                  name="templateTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Exame de Espirometria e Função Pulmonar Pediátrica"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="tpl-description" className="block font-semibold text-slate-300 mb-1">
                  Descrição Específica do Procedimento (Exigência LGPD Art. 11/14):
                </label>
                <textarea
                  id="tpl-description"
                  name="templateDescription"
                  value={procedureDescription}
                  onChange={(e) => setProcedureDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva detalhadamente a finalidade médica, os riscos, a metodologia e os profissionais envolvidos..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Texto Integral do Termo (Markdown):</label>
                <textarea
                  value={contentMarkdown}
                  onChange={(e) => setContentMarkdown(e.target.value)}
                  rows={6}
                  placeholder="# AUTORIZAÇÃO PARA REALIZAÇÃO DE PROCEDIMENTO MÉDICO..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Salvar e Versionar Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
