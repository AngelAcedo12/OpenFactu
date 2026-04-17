import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';

interface PluginManifest {
  id: string;
  name: string;
  logo?: string;
  ui: {
    routes: Array<{
      path: string;
      title: string;
      type: 'table' | 'form' | 'custom';
      icon?: string;
      config: any;
    }>;
    menuItems: Array<{
      label: string;
      path: string;
      icon: string;
    }>;
  };
}

interface PluginContextType {
  manifests: PluginManifest[];
  loading: boolean;
  reload: () => void;
  /** Timestamp del ultimo reload — los componentes lo usan para cache-bust */
  reloadTimestamp: number;
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

  return (
    <PluginContext.Provider value={{ manifests, loading, reload, reloadTimestamp }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) throw new Error('usePlugins must be used within PluginProvider');
  return context;
};
