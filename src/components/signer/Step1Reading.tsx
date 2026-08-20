import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, ShieldCheck, ChevronRight, FileSignature, CheckCircle2, FileText, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Step1ReadingProps {
  document: {
    id: string;
    minor_name: string;
    minor_birth_date: string;
    parent_name?: string;
    procedure_title: string;
    procedure_description: string;
    content_markdown: string;
    content_sha256: string;
    legal_notice: string;
  };
  onProceed: () => void;
}

export const Step1Reading: React.FC<Step1ReadingProps> = ({ document, onProceed }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Considerando uma margem de erro pequena para o scroll no final
    if (scrollHeight <= clientHeight || scrollTop + clientHeight >= scrollHeight - 50) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    handleScroll();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      
      {/* Header do Wizard */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-2">
          <FileSignature className="w-8 h-8 text-sesi-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          Análise do Termo de Consentimento
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Para prosseguirmos com a assinatura digital, é obrigatória a leitura integral do documento abaixo.
        </p>
      </div>

      {/* Caixa do Documento */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative group">
        
        {/* Barra superior de status do doc */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Documento</span>
              <span className="text-sm font-semibold text-slate-700">{document.procedure_title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded border border-slate-200">
            <span className="font-sans font-semibold uppercase tracking-wider text-[10px]">ID:</span>
            {document.id}
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-sesi-primary shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            <strong className="text-sesi-primary">Resumo:</strong> {document.procedure_description}
          </p>
        </div>

        {/* Área de Leitura com Scroll */}
        <div className="relative">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="p-6 sm:p-12 overflow-y-auto max-h-[55vh] bg-white scroll-smooth"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E1 transparent'
            }}
          >
            {/* O próprio Markdown */}
            <div className="prose prose-slate prose-sm sm:prose-base max-w-none 
                            prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight 
                            prose-h3:text-lg prose-h3:uppercase prose-h3:border-b prose-h3:border-slate-100 prose-h3:pb-2
                            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-justify
                            prose-strong:text-slate-800 prose-strong:font-bold
                            prose-li:text-slate-600 marker:text-sesi-primary">
              <ReactMarkdown>{document.content_markdown}</ReactMarkdown>
            </div>

            {/* Metadados ao final do documento */}
            <div className="mt-16 pt-8 border-t border-dashed border-slate-300 text-center space-y-4">
              <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg p-4 w-full max-w-lg">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Assinatura Eletrônica (Hash Criptográfico)
                </span>
                <span className="block text-xs font-mono text-slate-700 break-all bg-white border border-slate-100 p-2 rounded">
                  {document.content_sha256}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                {document.legal_notice}
              </p>
            </div>
          </div>

          {/* Gradiente sutil inferior para indicar mais conteúdo se não scrollou */}
          {!hasScrolledToBottom && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          )}
        </div>
      </div>

      {/* Painel de Ação Flutuante/Fixo */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex-1 w-full">
          {!hasScrolledToBottom ? (
            <div className="flex items-center gap-3 bg-amber-50 text-amber-800 p-3.5 rounded-xl border border-amber-200/60">
              <div className="bg-amber-100 p-1.5 rounded-lg shrink-0 animate-bounce">
                <ArrowDown className="w-5 h-5 text-amber-700" />
              </div>
              <p className="text-sm font-semibold">
                Para assinar, é necessário rolar o documento até o final.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-green-50 text-green-800 p-3.5 rounded-xl border border-green-200/60 transition-all duration-500 animate-in fade-in">
              <div className="bg-green-100 p-1.5 rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold">
                Leitura concluída com sucesso. Você pode prosseguir.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onProceed}
          disabled={!hasScrolledToBottom}
          className={`w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-3 font-bold rounded-xl transition-all duration-300 ${
            hasScrolledToBottom
              ? 'bg-sesi-primary hover:bg-blue-800 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Avançar para Assinatura</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
