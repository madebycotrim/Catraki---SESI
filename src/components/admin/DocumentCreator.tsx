import React, { useState, useEffect } from 'react';
import { PlusCircle, Send, Copy, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api.ts';
import type { DocumentTemplate } from '../../lib/types.ts';

interface DocumentCreatorProps {
  onDocumentCreated?: () => void;
}

export const DocumentCreator: React.FC<DocumentCreatorProps> = ({ onDocumentCreated }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [minorName, setMinorName] = useState('Lucas Cotrim Silva');
  const [minorBirthDate, setMinorBirthDate] = useState('2010-05-14');
  const [parentName, setParentName] = useState('Mateus Cotrim');
  const [parentEmail, setParentEmail] = useState('mateus.cotrim@exemplo.com');
  const [parentPhone, setParentPhone] = useState('(11) 98765-4321');
  const [expiresInDays, setExpiresInDays] = useState(7);

  const [loading, setLoading] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const resp = await apiClient.getAdminTemplates();
    if (resp.success && resp.templates.length > 0) {
      setTemplates(resp.templates);
      setSelectedTemplateId(resp.templates[0].id);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setCreatedDoc(null);

    try {
      const resp = await apiClient.createAdminDocument({
        template_id: selectedTemplateId,
        minor_name: minorName,
        minor_birth_date: minorBirthDate,
        parent_name: parentName,
        parent_email: parentEmail,
        parent_phone: parentPhone,
        expires_in_days: expiresInDays,
      });

      if (resp.success && resp.document) {
        setCreatedDoc(resp.document);
        if (onDocumentCreated) onDocumentCreated();
      } else {
        setErrorMessage(resp.error || 'Erro ao emitir termo de autorização.');
      }
    } catch {
      setErrorMessage('Falha ao emitir termo.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
          <PlusCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Emitir Novo Termo de Procedimento Médico</h2>
          <p className="text-xs text-slate-400">
            Geração de link de assinatura com dados sensíveis criptografados em repouso (AES-256-GCM).
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-200 text-xs">
          {errorMessage}
        </div>
      )}

      {!createdDoc ? (
        <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
          {/* Seleção do Template de Procedimento */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Template de Procedimento Médico Específico (LGPD Art. 11):
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500 transition-colors"
            >
              {templates.map((tmpl) => (
                <option key={`${tmpl.id}-v${tmpl.version}`} value={tmpl.id}>
                  {tmpl.title} (v{tmpl.version})
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-[11px] text-blue-300/80 mt-1 bg-blue-950/30 p-2 rounded border border-blue-900/30">
                <strong>Escopo Clínico:</strong> {selectedTemplate.procedure_description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Nome Completo do Menor:
              </label>
              <input
                type="text"
                value={minorName}
                onChange={(e) => setMinorName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Data de Nascimento do Menor:
              </label>
              <input
                type="date"
                value={minorBirthDate}
                onChange={(e) => setMinorBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Nome do Responsável Legal:
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                E-mail de Notificação / 2FA:
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Celular para SMS (Opcional):
              </label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Prazo de Validade do Link:
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-blue-500"
              >
                <option value={3}>3 Dias</option>
                <option value={7}>7 Dias (Padrão)</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gerar Termo e Link de Assinatura</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-900/50 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Termo Emitido com Sucesso!</span>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
            <div><strong>Protocolo:</strong> <span className="font-mono text-blue-300">{createdDoc.id}</span></div>
            <div><strong>Procedimento:</strong> {createdDoc.template_title}</div>
            <div><strong>Link do Signatário:</strong> <span className="font-mono text-slate-300">{window.location.origin}{createdDoc.sign_url}</span></div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}${createdDoc.sign_url}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Assinatura'}</span>
            </button>

            <button
              onClick={() => setCreatedDoc(null)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Emitir Outro Termo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
