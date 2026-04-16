import { useState, useMemo, useEffect } from 'react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  options?: { label: string; value: any }[];
  placeholder?: string;
  predicate?: (item: any, value: any) => boolean;
}

export interface UseDataTableProps<T> {
  data: T[];
  searchColumns: (keyof T)[];
  filters?: FilterConfig[];
}

export function useDataTable<T>({
  data,
  searchColumns,
  filters: filterConfigs = [],
}: UseDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      // 1. Global Search (debounced)
      if (debouncedSearch) {
        const matchesSearch = searchColumns.some((col) => {
          const val = String(item[col] || '').toLowerCase();
          return val.includes(debouncedSearch.toLowerCase());
        });
        if (!matchesSearch) return false;
      }

      // 2. Active Filters
      for (const config of filterConfigs) {
        const filterValue = activeFilters[config.key];
        if (filterValue === undefined || filterValue === '' || filterValue === null) continue;

        if (config.predicate) {
          if (!config.predicate(item, filterValue)) return false;
        } else {
          // Default Exact Match logic
          const itemValue = item[config.key];

          if (config.type === 'dateRange') {
            const itemDate = new Date(itemValue).getTime();
            const { start, end } = filterValue;
            if (start && itemDate < new Date(start).getTime()) return false;
            if (end && itemDate > new Date(end).getTime()) return false;
          } else {
            if (String(itemValue) !== String(filterValue)) return false;
          }
        }
      }

      return true;
    });
    // searchColumns y filterConfigs son estables en la práctica (mismas keys/types entre renders);
    // excluirlos evita recálculos espurios causados por nuevas referencias de options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, debouncedSearch, activeFilters]);

  const setFilter = (key: string, value: any) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
  };

  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilters,
  };
}
