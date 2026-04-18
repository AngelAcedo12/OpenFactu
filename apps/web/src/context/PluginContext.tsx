import React, { createContext, useContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { CORE_MODULES, findActiveModule, type Module, type SubTab } from '../modules/registry';

interface PluginRoute {
  path: string;
  title: string;
  type: 'table' | 'form' | 'custom' | 'dashboard';
  icon?: string;
  config?: any;
}

interface PluginMenuItem {
  label: string;
  path: string;
  icon: string;
}

interface PluginModuleManifest {
  id: string;
  label: string;
  icon: string;
  subTabs?: Array<{ label: string; path: string; icon?: string }>;
}

interface PluginSubTabManifest {
  moduleId: string;
  label: string;
  path: string;
  icon?: string;
}

interface PluginManifest {
  id: string;
  name: string;
  logo?: string;
  ui: {
    routes?: PluginRoute[];
    /** @deprecated mapped al módulo "plugins" */
    menuItems?: PluginMenuItem[];
    modules?: PluginModuleManifest[];
    subTabs?: PluginSubTabManifest[];
  };
}

interface PluginContextType {
  manifests: PluginManifest[];
  loading: boolean;
  reload: () => void;
  /** Timestamp del ultimo reload — los componentes lo usan para cache-bust */
  reloadTimestamp: number;
  /** Módulos core + de plugins ya mergeados. */
  modules: Module[];
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTimestamp, setReloadTimestamp] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  const fetchManifests = useCallback(async () => {
    try {
      const token = localStorage.getItem('openfactu_token');
      const fetchHeaders: Record<string, string> = {};
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/plugins/manifests', { headers: fetchHeaders });
      if (!res.ok) {
        setManifests([]);
        return;
      }
      const text = await res.text();
      if (!text.trim()) {
        setManifests([]);
        return;
      }
      try {
        const data = JSON.parse(text);
        setManifests(Array.isArray(data) ? data : []);
      } catch {
        setManifests([]);
      }
    } catch {
      setManifests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  // WebSocket de desarrollo para hot reload — solo en dev
  useEffect(() => {
    if (import.meta.env.PROD) return;

    const wsUrl = `ws://${window.location.hostname}:3000/ws/plugins`;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stopped) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'plugin:reload') {
              console.log(`[HotReload] Plugin ${data.pluginId} recargado`);
              if (data.manifests) {
                setManifests(data.manifests);
              } else {
                fetchManifests();
              }
              setReloadTimestamp(Date.now());
            }
          } catch {}
        };

        ws.onclose = () => {
          if (stopped) return;
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        /* noop */
      }
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [fetchManifests]);

  const reload = useCallback(() => {
    fetchManifests();
    setReloadTimestamp(Date.now());
  }, [fetchManifests]);

  // Mergear módulos core + módulos/sub-tabs aportados por plugins
  const modules = useMemo<Module[]>(() => {
    // Clone para no mutar
    const merged: Module[] = CORE_MODULES.map((m) => ({ ...m, subTabs: [...m.subTabs] }));

    for (const manifest of manifests) {
      // 1) Módulos top-level del plugin → añadir si no existen ya
      for (const pmod of manifest.ui?.modules || []) {
        if (merged.some((m) => m.id === pmod.id)) continue;
        merged.push({
          id: pmod.id,
          label: pmod.label,
          icon: pmod.icon,
          subTabs: (pmod.subTabs || []).map((s) => ({
            id: `${manifest.id}__${s.path}`,
            label: s.label,
            path: s.path,
            icon: s.icon,
          })),
        });
      }

      // 2) Sub-tabs inyectados en módulos existentes
      for (const sub of manifest.ui?.subTabs || []) {
        const target = merged.find((m) => m.id === sub.moduleId);
        if (!target) continue;
        target.subTabs.push({
          id: `${manifest.id}__${sub.path}`,
          label: sub.label,
          path: sub.path,
          icon: sub.icon,
        });
      }

      // 3) Legacy menuItems → mapear todos al módulo "plugins"
      const legacyTarget = merged.find((m) => m.id === 'plugins');
      if (legacyTarget) {
        for (const item of manifest.ui?.menuItems || []) {
          legacyTarget.subTabs.push({
            id: `${manifest.id}__legacy__${item.path}`,
            label: item.label,
            path: item.path,
            icon: item.icon,
          });
        }
      }
    }

    return merged;
  }, [manifests]);

  return (
    <PluginContext.Provider value={{ manifests, loading, reload, reloadTimestamp, modules }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) throw new Error('usePlugins must be used within PluginProvider');
  return context;
};

/** Devuelve la lista combinada de módulos core + plugins. */
export const useModules = (): Module[] => {
  const { modules } = usePlugins();
  return modules;
};

/**
 * Devuelve el módulo activo dado un pathname.
 * El pathname se pasa explícitamente para evitar acoplar este hook a TabsContext
 * (los consumidores leen useTabs() ellos mismos).
 */
export const useActiveModule = (pathname: string): Module | null => {
  const modules = useModules();
  return findActiveModule(modules, pathname);
};

export type { SubTab };
