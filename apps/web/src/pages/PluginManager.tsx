import React, { useEffect, useState, useCallback } from 'react';
import { Card, Badge, Button, useToast } from '@openfactu/ui';
import { Puzzle, Database, RefreshCw, Shield, Zap, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlugins } from '../context/PluginContext';
import { PluginIcon } from '../components/PluginIcon';

interface PluginInfo {
  id: string;
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  logo?: string;
  isActive: boolean;
  ui?: any;
}

interface PluginField {
  pluginId: string;
  tableName: string;
  fieldName: string;
  fieldType: string;
  label: string;
}

interface PluginTable {
  pluginId: string;
  tableName: string;
  definition: string;
}

export const PluginManager: React.FC = () => {
  const { token, user } = useAuth();
  const { reload: reloadManifests } = usePlugins();
  const toast = useToast();

  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [fields, setFields] = useState<PluginField[]>([]);
  const [tables, setTables] = useState<PluginTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-tenant-id': user?.tenantId || '',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pluginsRes, fieldsRes, tablesRes] = await Promise.all([
        fetch('/api/plugins/available', { headers }),
        fetch('/api/plugins/fields', { headers }),
        fetch('/api/plugins/tables', { headers }),
      ]);
      setPlugins(await pluginsRes.json());
      setFields(await fieldsRes.json());
      setTables(await tablesRes.json());
    } catch (err) {
      toast.error('Error al cargar datos de plugins');
    } finally {
      setLoading(false);
    }
  }, [token, user?.tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePlugin = async (pluginId: string, currentlyActive: boolean) => {
    setToggling(pluginId);
    const action = currentlyActive ? 'deactivate' : 'activate';

    try {
      const res = await fetch(`/api/plugins/${pluginId}/${action}`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }

      // Actualizar estado local inmediatamente
      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, isActive: !currentlyActive } : p)),
      );

      // Recargar manifests del contexto global (afecta sidebar)
      reloadManifests();

      // Recargar fields/tables (pueden cambiar con activación)
      const [fieldsRes, tablesRes] = await Promise.all([
        fetch('/api/plugins/fields', { headers }),
        fetch('/api/plugins/tables', { headers }),
      ]);
      setFields(await fieldsRes.json());
      setTables(await tablesRes.json());

      toast.success(
        currentlyActive
          ? `Plugin "${pluginId}" desactivado`
          : `Plugin "${pluginId}" activado`,
      );
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado del plugin');
    } finally {
      setToggling(null);
    }
  };

  const activeCount = plugins.filter((p) => p.isActive).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Gestor de Plugins
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Activa o desactiva extensiones para esta empresa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-300">
            <Zap size={14} />
            <span>
              <strong>{activeCount}</strong> / {plugins.length} activos
            </span>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* Plugin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))
          : plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                fields={fields.filter((f) => f.pluginId === plugin.id)}
                tables={tables.filter((t) => t.pluginId === plugin.id)}
                onToggle={() => togglePlugin(plugin.id, plugin.isActive)}
                isToggling={toggling === plugin.id}
              />
            ))}
      </div>

      {plugins.length === 0 && !loading && (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
          <Puzzle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay plugins instalados</p>
          <p className="text-sm mt-1">
            Coloca plugins en la carpeta <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/plugins/</code> del servidor.
          </p>
        </div>
      )}

      {/* DB Extensions */}
      {fields.length > 0 && (
        <Card
          title="Campos de Base de Datos"
          subtitle="Campos inyectados por plugins activos en los esquemas de tenant."
        >
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-200 rounded-lg text-sm">
            <Database size={16} />
            <span>
              Solo se muestran campos de plugins activos para esta empresa.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Plugin</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Tabla</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Campo</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Tipo</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Etiqueta</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{f.pluginId}</td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{f.tableName}</td>
                    <td className="py-2 px-3">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{f.fieldName}</code>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="neutral">{f.fieldType}</Badge>
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{f.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tables.length > 0 && (
        <Card
          title="Tablas de Plugins"
          subtitle="Tablas creadas por extensiones activas."
          className="mt-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Plugin</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Tabla</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Estructura</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{t.pluginId}</td>
                    <td className="py-2 px-3">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{t.tableName}</code>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-xs block">
                        {t.definition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ── Plugin Card Component ────────────────────────────────────

interface PluginCardProps {
  plugin: PluginInfo;
  fields: PluginField[];
  tables: PluginTable[];
  onToggle: () => void;
  isToggling: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, fields, tables, onToggle, isToggling }) => {
  const extensionCount = fields.length + tables.length;

  return (
    <div
      className={`
        relative bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200
        ${plugin.isActive
          ? 'border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-100 dark:shadow-none'
          : 'border-slate-200 dark:border-slate-800 opacity-75'
        }
      `}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm overflow-hidden p-2
                ${plugin.isActive
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }
              `}
            >
              <PluginIcon
                iconName={plugin.logo}
                size={24}
                className={plugin.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {plugin.name || plugin.id}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {plugin.id}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`
              relative w-12 h-7 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              ${plugin.isActive
                ? 'bg-emerald-500 focus:ring-emerald-400'
                : 'bg-slate-300 dark:bg-slate-600 focus:ring-slate-400'
              }
            `}
            title={plugin.isActive ? 'Desactivar plugin' : 'Activar plugin'}
          >
            <span
              className={`
                absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200
                ${plugin.isActive ? 'translate-x-5.5 left-auto right-0.5' : 'left-0.5'}
              `}
              style={{
                transform: plugin.isActive ? 'translateX(0)' : 'translateX(0)',
                left: plugin.isActive ? 'auto' : '2px',
                right: plugin.isActive ? '2px' : 'auto',
              }}
            />
          </button>
        </div>

        {/* Description */}
        {plugin.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
            {plugin.description}
          </p>
        )}

        {/* Footer info */}
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {plugin.version && (
            <span className="flex items-center gap-1">
              <Shield size={12} />
              v{plugin.version}
            </span>
          )}
          {extensionCount > 0 && (
            <span className="flex items-center gap-1">
              <Database size={12} />
              {extensionCount} {extensionCount === 1 ? 'extensión' : 'extensiones'} BD
            </span>
          )}
          {plugin.ui?.routes?.length > 0 && (
            <span className="flex items-center gap-1">
              <Power size={12} />
              {plugin.ui.routes.length} {plugin.ui.routes.length === 1 ? 'vista' : 'vistas'} UI
            </span>
          )}
          <span
            className={`
              ml-auto flex items-center gap-1 font-semibold
              ${plugin.isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}
            `}
          >
            {plugin.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>
    </div>
  );
};
