import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, ShieldAlert, ChevronRight } from 'lucide-react';

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
    
    // Se a altura visível for maior ou igual ao scroll (texto curto) ou o usuário chegou no final
    if (scrollHeight <= clientHeight || scrollTop + clientHeight >= scrollHeight - 35) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    // Checar inicialmente caso a tela seja grande e o documento caiba todo
    handleScroll();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Termo de Consentimento</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Por favor, leia atentamente as condições legais e de tratamento de dados abaixo antes de prosseguir com a autorização.
        </p>
      </div>

      {/* Papel Digital (Estilo A4 Oficial) */}
      <div className="bg-slate-200/50 p-4 sm:p-8 flex justify-center rounded-xl shadow-inner border border-slate-200">
        <div 
          className="bg-white w-full max-w-3xl shadow-sm border border-slate-300 flex flex-col relative"
          style={{ minHeight: '600px' }}
        >
          {/* Tarja superior discreta */}
          <div className="w-full h-1.5 bg-sesi-primary"></div>
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="p-8 sm:p-14 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] flex-grow text-sm text-slate-700 leading-relaxed text-justify font-serif"
          >
            <div className="mb-8 text-center border-b border-slate-200 pb-6">
              <h1 className="text-xl font-bold font-sans text-slate-900 mb-2 uppercase tracking-wider">
                {document.procedure_title}
              </h1>
              <p className="text-xs text-slate-500 font-sans tracking-widest uppercase">Protocolo: {document.id}</p>
            </div>

            <div className="mb-8 font-sans bg-slate-50 p-5 border border-slate-200 rounded-sm">
              <span className="block text-slate-800 uppercase text-xs font-bold mb-2 tracking-wider">Resumo da Autorização:</span>
              <span className="text-slate-600">{document.procedure_description}</span>
            </div>

            <div className="whitespace-pre-wrap">
              {document.content_markdown}
            </div>

            <div className="mt-14 pt-8 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center space-y-1">
              <p>Código Hash SHA-256 do Documento Original:</p>
              <p className="font-semibold text-slate-500 break-all bg-slate-50 inline-block px-2 py-1 rounded">{document.content_sha256}</p>
              <p className="mt-4 font-sans">{document.legal_notice}</p>
            </div>
          </div>
          
          {/* Sombra suave de fim de página */}
          <div className="h-8 bg-gradient-to-t from-white via-white/80 to-transparent w-full absolute bottom-0 left-0 pointer-events-none"></div>
        </div>
      </div>

      {/* Indicador de rolagem e botão */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 w-full flex items-center gap-3">
          {!hasScrolledToBottom ? (
            <div className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200/50 w-full">
              <ArrowDown className="w-5 h-5 shrink-0 animate-bounce" />
              <span className="font-medium">Por favor, role o documento até o final para confirmar a leitura.</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-200/50 w-full">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="font-medium">Leitura confirmada. Você já pode preencher seus dados.</span>
            </div>
          )}
        </div>
        <button
          onClick={onProceed}
          disabled={!hasScrolledToBottom}
          className={`shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
            hasScrolledToBottom
              ? 'bg-sesi-primary hover:bg-blue-800 text-white shadow-md cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <span>Preencher Dados</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
