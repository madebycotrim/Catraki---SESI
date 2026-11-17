import React from 'react';

interface DocumentSheetLayoutProps {
  kicker?: string;
  subtitle: string;
  docNumber?: string;
  institutionName?: string;
  pageNumber?: number;
  topActions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout reutilizável de Folha A4 (padrão ABNT) para eliminar duplicação de cabeçalho,
 * formatação de data e barra institucional nas páginas do fluxo de assinatura e LGPD.
 */
export const DocumentSheetLayout: React.FC<DocumentSheetLayoutProps> = ({
  kicker = 'PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA',
  subtitle,
  docNumber,
  institutionName,
  pageNumber,
  topActions,
  children,
}) => {
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1 text-slate-800">
      {topActions && <div className="mb-4 px-1 no-print">{topActions}</div>}

      <div className="document-sheet-a4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              {kicker}
            </p>
            {docNumber ? (
              <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
                Doc. nº {docNumber}
              </p>
            ) : (
              <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">{subtitle}</p>
            )}
            {institutionName && (
              <p className="text-[11px] sm:text-[8.5pt] text-[#004b8d] m-0 font-bold">
                {institutionName}
              </p>
            )}
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">{dataHoje}</p>
          </div>
        </div>

        {children}

        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

        {pageNumber !== undefined && (
          <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
            {pageNumber}
          </div>
        )}
      </div>
    </div>
  );
};
