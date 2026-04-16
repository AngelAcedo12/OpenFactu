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

  // WebSocket de desarrollo para hot reload
  useEffect(() => {
    // Solo conectar en desarrollo
    const wsUrl = `ws://${window.location.hostname}:3000/ws/plugins`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'plugin:reload') {
              console.log(`[HotReload] Plugin ${data.pluginId} recargado`);
              // Actualizar manifests directamente si vienen en el mensaje
              if (data.manifests) {
                setManifests(data.manifests);
              } else {
                fetchManifests();
              }
              // Actualizar timestamp para que los componentes se refresquen
              setReloadTimestamp(Date.now());
            }
          } catch {}
        };

        ws.onclose = () => {
          // Reconectar en 3 segundos
          setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket no disponible (produccion o servidor apagado)
      }
    };

    connect();

    return () => {
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
