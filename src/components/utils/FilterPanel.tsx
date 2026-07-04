import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export type FilterType = 'select' | 'number' | 'text';

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  options?: FilterOption[]; // Required for 'select'
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
  onClear: () => void;
  totalResults?: number;
  filteredResults?: number;
}

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  activeFilters,
  onApply,
  onClear,
  totalResults,
  filteredResults
}: FilterPanelProps) {
  const [pendingFilters, setPendingFilters] = useState<Record<string, any>>(activeFilters);

  // Sync pending filters when panel opens or active filters change
  useEffect(() => {
    if (isOpen) {
      setPendingFilters(activeFilters);
    }
  }, [isOpen, activeFilters]);

  const handleChange = (id: string, value: any) => {
    setPendingFilters(prev => ({ ...prev, [id]: value }));
  };

  const handleApply = () => {
    onApply(pendingFilters);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Filtrar resultados</span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {filters.map(filter => (
              <div key={filter.id}>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && (
                  <select
                    value={pendingFilters[filter.id] ?? ''}
                    onChange={e => handleChange(filter.id, e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all"
                  >
                    <option value="">Todos</option>
                    {filter.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'number' && (
                  <input
                    type="number"
                    min={filter.min}
                    max={filter.max}
                    step={filter.step}
                    placeholder={filter.placeholder}
                    value={pendingFilters[filter.id] ?? ''}
                    onChange={e => handleChange(filter.id, e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all"
                  />
                )}

                {filter.type === 'text' && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={pendingFilters[filter.id] ?? ''}
                    onChange={e => handleChange(filter.id, e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Acciones del panel */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
              {totalResults !== undefined && filteredResults !== undefined
                ? filteredResults === totalResults
                  ? `${totalResults} resultados en total`
                  : `${filteredResults} de ${totalResults} resultados`
                : ''}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClear}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Limpiar filtros
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2 bg-gb-primary text-white text-sm font-bold rounded-xl hover:bg-gb-primary/90 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
