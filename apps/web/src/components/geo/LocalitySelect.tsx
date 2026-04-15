import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useGeo, GeoRow } from '../../hooks/useGeo';

interface Props {
  subRegionId: string;
  value: string;        // localityId
  valueName?: string;   // nombre actual para mostrar cuando no hay query
  onChange: (locality: GeoRow | null) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Autocomplete remoto de localidades. Busca con debounce de 220ms.
 */
export const LocalitySelect: React.FC<Props> = ({ subRegionId, value, valueName, onChange, label, disabled }) => {
  const { searchLocalities, getCountry } = useGeo();
  const [query, setQuery] = useState(valueName || '');
  const [results, setResults] = useState<GeoRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(valueName || ''); }, [valueName]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!subRegionId || query.trim().length < 1) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchLocalities(subRegionId, query);
        setResults(rows);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handler);
  }, [subRegionId, query, searchLocalities]);

  return (
    <div ref={wrapperRef} className="relative">
      {label && <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{label}</label>}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          disabled={disabled || !subRegionId}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={subRegionId ? 'Buscar municipio...' : 'Selecciona antes la provincia'}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50"
        />
      </div>
      {open && subRegionId && query.trim().length >= 1 && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">Sin resultados</div>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(r); setQuery(r.name); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 dark:hover:bg-primary/10 ${r.id === value ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
