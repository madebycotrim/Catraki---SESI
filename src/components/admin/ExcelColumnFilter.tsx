import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  ArrowDownAZ, 
  ArrowUpZA, 
  Search, 
  X, 
  RotateCcw, 
  Check 
} from 'lucide-react';

export interface ExcelOption {
  value: string;
  label: string;
  count: number;
}

export interface ExcelColumnFilterProps {
  columnId: string;
  title: string;
  options: ExcelOption[];
  selectedValues: Set<string> | null; // null means no filter (all included)
  onFilterChange: (columnId: string, newSelected: Set<string> | null) => void;
  currentSortColumn: string | null;
  currentSortDirection: 'asc' | 'desc' | null;
  onSortChange: (columnId: string, direction: 'asc' | 'desc' | null) => void;
  align?: 'left' | 'right';
  className?: string;
}

export const ExcelColumnFilter: React.FC<ExcelColumnFilterProps> = ({
  columnId,
  title,
  options,
  selectedValues,
  onFilterChange,
  currentSortColumn,
  currentSortDirection,
  onSortChange,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local pending selection while popover is open
  const [tempSelected, setTempSelected] = useState<Set<string>>(() => {
    if (selectedValues === null) {
      return new Set(options.map(o => o.value));
    }
    return new Set(selectedValues);
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync tempSelected whenever popover opens or options/selectedValues change
  useEffect(() => {
    if (isOpen) {
      if (selectedValues === null) {
        setTempSelected(new Set(options.map(o => o.value)));
      } else {
        setTempSelected(new Set(selectedValues));
      }
      setSearchTerm('');
    }
  }, [isOpen, selectedValues, options]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isFiltered = selectedValues !== null && selectedValues.size < options.length;
  const isSorted = currentSortColumn === columnId && currentSortDirection !== null;

  // Filter options based on inner search
  const visibleOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Check if all visible options are selected
  const isAllVisibleSelected = visibleOptions.length > 0 && visibleOptions.every(o => tempSelected.has(o.value));
  const isSomeVisibleSelected = visibleOptions.some(o => tempSelected.has(o.value)) && !isAllVisibleSelected;

  const handleToggleAllVisible = () => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        // Deselect all visible
        visibleOptions.forEach(o => next.delete(o.value));
      } else {
        // Select all visible
        visibleOptions.forEach(o => next.add(o.value));
      }
      return next;
    });
  };

  const handleToggleOption = (val: string) => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const handleApply = () => {
    // If all available options are selected, it's equivalent to no filter (null)
    if (tempSelected.size === options.length) {
      onFilterChange(columnId, null);
    } else {
      onFilterChange(columnId, new Set(tempSelected));
    }
    setIsOpen(false);
  };

  const handleClearColumnFilter = () => {
    onFilterChange(columnId, null);
    setTempSelected(new Set(options.map(o => o.value)));
    setIsOpen(false);
  };

  const handleSortAsc = () => {
    onSortChange(columnId, 'asc');
    setIsOpen(false);
  };

  const handleSortDesc = () => {
    onSortChange(columnId, 'desc');
    setIsOpen(false);
  };

  const handleClearSort = () => {
    onSortChange(columnId, null);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-flex items-center justify-between w-full gap-1.5 select-none ${className}`}>
      {/* Title & Sort Indicator */}
      <div 
        onClick={() => {
          // Clicking title toggles sort
          if (currentSortColumn === columnId) {
            if (currentSortDirection === 'asc') onSortChange(columnId, 'desc');
            else if (currentSortDirection === 'desc') onSortChange(columnId, null);
            else onSortChange(columnId, 'asc');
          } else {
            onSortChange(columnId, 'asc');
          }
        }}
        className="flex items-center gap-1 cursor-pointer hover:text-blue-900 transition-colors truncate"
        title={`Clique para classificar por ${title}`}
      >
        <span className="truncate">{title}</span>
        {isSorted && (
          <span className="inline-flex items-center text-blue-700 font-bold ml-0.5">
            {currentSortDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-[#004b8d]" />
            ) : (
              <ArrowDown className="w-3 h-3 text-[#004b8d]" />
            )}
          </span>
        )}
      </div>

      {/* Excel Filter Funnel Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-md transition-all cursor-pointer shrink-0 flex items-center justify-center ${
          isFiltered
            ? 'bg-[#004b8d] text-white shadow-xs hover:bg-[#003666] ring-2 ring-blue-300'
            : isOpen
            ? 'bg-slate-200 text-slate-800'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80'
        }`}
        title={isFiltered ? `Filtro ativo em "${title}". Clique para ajustar.` : `Filtrar coluna "${title}" (Estilo Excel)`}
        aria-label={`Filtrar coluna ${title}`}
      >
        <Filter className={`w-3 h-3 ${isFiltered ? 'fill-current' : ''}`} />
      </button>

      {/* Excel Dropdown Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 z-50 w-72 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 space-y-3 font-sans normal-case text-left ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ minWidth: '260px' }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <Filter className="w-3.5 h-3.5 text-[#004b8d]" />
              <span className="truncate">Filtro: {title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sorting Options (Excel-style) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleSortAsc}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                currentSortColumn === columnId && currentSortDirection === 'asc'
                  ? 'bg-blue-50 text-[#004b8d] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
              <span>Classificar de A a Z (Crescente)</span>
              {currentSortColumn === columnId && currentSortDirection === 'asc' && (
                <Check className="w-3.5 h-3.5 ml-auto text-[#004b8d]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleSortDesc}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                currentSortColumn === columnId && currentSortDirection === 'desc'
                  ? 'bg-blue-50 text-[#004b8d] font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ArrowUpZA className="w-4 h-4 text-blue-600" />
              <span>Classificar de Z a A (Decrescente)</span>
              {currentSortColumn === columnId && currentSortDirection === 'desc' && (
                <Check className="w-3.5 h-3.5 ml-auto text-[#004b8d]" />
              )}
            </button>

            {isSorted && (
              <button
                type="button"
                onClick={handleClearSort}
                className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Limpar Classificação</span>
              </button>
            )}
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Quick Clear Column Filter */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleClearColumnFilter}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors text-left cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Limpar Filtro desta Coluna</span>
            </button>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar opções..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#004b8d] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List (Checkboxes) */}
          <div className="space-y-1">
            {/* Select All Checkbox */}
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-800 border-b border-slate-100 select-none">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeVisibleSelected;
                }}
                onChange={handleToggleAllVisible}
                className="w-3.5 h-3.5 rounded text-[#004b8d] focus:ring-blue-500/20 border-slate-300 cursor-pointer"
              />
              <span className="truncate">
                {searchTerm ? '(Selecionar Filtrados)' : '(Selecionar Tudo)'}
              </span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">
                {visibleOptions.length}
              </span>
            </label>

            {/* Individual Item Checkboxes */}
            <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {visibleOptions.length > 0 ? (
                visibleOptions.map((opt) => {
                  const isChecked = tempSelected.has(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors select-none ${
                        isChecked ? 'text-slate-900 font-semibold' : 'text-slate-500'
                      }`}
                      title={opt.label}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOption(opt.value)}
                          className="w-3.5 h-3.5 rounded text-[#004b8d] focus:ring-blue-500/20 border-slate-300 cursor-pointer shrink-0"
                        />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono shrink-0">
                        {opt.count}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Nenhum item encontrado
                </div>
              )}
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#004b8d] hover:bg-[#003666] shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
