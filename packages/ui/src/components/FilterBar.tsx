import { Search, Filter, X } from 'lucide-react';
import { cn } from '../utils';

export interface FilterBarConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { label: string; value: any }[];
  placeholder?: string;
}

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
  config: FilterBarConfig[];
  className?: string;
  searchPlaceholder?: string;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  activeFilters,
  onFilterChange,
  onClear,
  config,
  className,
  searchPlaceholder = "Buscar registros..."
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 p-4 bg-white border-b border-slate-100", className)}>
      {/* Global Search */}
      <div className="relative flex-none w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full h-10 pl-10 pr-4 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Dynamic Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {config.map((filter) => (
          <div key={filter.key} className="relative">
            {filter.type === 'select' ? (
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-all cursor-pointer min-w-[120px]"
              >
                <option value="">{filter.label}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-all cursor-pointer"
              />
            ) : (
              <input
                type="text"
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                placeholder={filter.label}
                className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 transition-all min-w-[120px]"
              />
            )}
            
            {/* Indicator of active filter */}
            {filter.type === 'select' && (
               <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
            )}
          </div>
        ))}

        {/* Clear Button */}
        {(searchTerm || Object.values(activeFilters).some(v => v !== '')) && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 h-10 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest"
          >
            <X size={14} />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
