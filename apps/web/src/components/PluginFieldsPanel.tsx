import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, cn } from '@openfactu/ui';
import { ChevronRight, Puzzle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PluginFieldDef {
  id: string;
  pluginId: string;
  tableName: string;
  fieldName: string;
  fieldType: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'JSONB';
  label: string;
}

// Caché global por tableName
const fieldCache: Record<string, PluginFieldDef[]> = {};
const fieldInflight: Set<string> = new Set();
const fieldListeners: Set<() => void> = new Set();

interface Props {
  tableName: string;
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  disabled?: boolean;
  /** 'sidebar' muestra un panel colapsable; 'inline' se integra dentro del form */
  layout?: 'sidebar' | 'inline';
  /** Título del panel. Default: 'Campos Personalizados' */
  title?: string;
}

/**
 * Panel genérico de campos de plugin. Se puede poner en CUALQUIER formulario o detalle
 * pasando sólo `tableName`. Automáticamente descubre los campos registrados por plugins
 * para esa tabla y los renderiza.
 *
 * Si no hay campos registrados, no renderiza nada.
 */
export const PluginFieldsPanel: React.FC<Props> = ({
  tableName,
  values,
  onChange,
  disabled = false,
  layout = 'inline',
  title = 'Campos Personalizados',
}) => {
  const { token, user } = useAuth();
  const [fields, setFields] = useState<PluginFieldDef[]>(fieldCache[tableName] ?? []);
  const [loading, setLoading] = useState(!fieldCache[tableName]);
  const [collapsed, setCollapsed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (fieldCache[tableName]) {
      setFields(fieldCache[tableName]);
      setLoading(false);
      return;
    }
    if (fieldInflight.has(tableName)) {
      const listener = () => {
        if (fieldCache[tableName] && mounted.current) {
          setFields(fieldCache[tableName]);
          setLoading(false);
          fieldListeners.delete(listener);
        }
      };
      fieldListeners.add(listener);
      return () => {
        fieldListeners.delete(listener);
      };
    }

    fieldInflight.add(tableName);
    setLoading(true);

    fetch(`/api/plugins/fields/${tableName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': user?.tenantId || '',
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const defs = Array.isArray(data) ? data : [];
        fieldCache[tableName] = defs;
        fieldInflight.delete(tableName);
        if (mounted.current) {
          setFields(defs);
          setLoading(false);
        }
        fieldListeners.forEach((fn) => fn());
      })
      .catch(() => {
        fieldCache[tableName] = [];
        fieldInflight.delete(tableName);
        if (mounted.current) {
          setFields([]);
          setLoading(false);
        }
      });
  }, [tableName, token, user?.tenantId]);

  if (loading || fields.length === 0) return null;

  const renderField = (f: PluginFieldDef) => {
    const val = values[f.fieldName];
    switch (f.fieldType) {
      case 'BOOLEAN':
        return (
          <label className="flex items-center gap-2 h-9 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => onChange(f.fieldName, e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {val ? 'Sí' : 'No'}
            </span>
          </label>
        );
      case 'DATE':
        return (
          <Input
            type="date"
            value={val || ''}
            onChange={(e) => onChange(f.fieldName, e.target.value)}
            disabled={disabled}
          />
        );
      case 'INTEGER':
        return (
          <Input
            type="number"
            value={val ?? ''}
            onChange={(e) => onChange(f.fieldName, parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="tabular-nums"
          />
        );
      case 'DECIMAL':
        return (
          <Input
            type="text"
            inputMode="decimal"
            value={val ?? ''}
            onChange={(e) => onChange(f.fieldName, e.target.value)}
            disabled={disabled}
            className="tabular-nums"
          />
        );
      case 'JSONB':
        return (
          <textarea
            value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val || ''}
            onChange={(e) => {
              try {
                onChange(f.fieldName, JSON.parse(e.target.value));
              } catch {
                onChange(f.fieldName, e.target.value);
              }
            }}
            disabled={disabled}
            rows={3}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={val || ''}
            onChange={(e) => onChange(f.fieldName, e.target.value)}
            disabled={disabled}
            placeholder={f.label}
          />
        );
    }
  };

  if (layout === 'sidebar') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Puzzle size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {title}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              {fields.length}
            </span>
          </div>
          {collapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {!collapsed && (
          <div className="p-4 space-y-4">
            {fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {f.label}
                </label>
                {renderField(f)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Layout inline
  return (
    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Puzzle size={14} className="text-primary" />
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          {title}
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {f.label}
            </label>
            {renderField(f)}
          </div>
        ))}
      </div>
    </div>
  );
};
