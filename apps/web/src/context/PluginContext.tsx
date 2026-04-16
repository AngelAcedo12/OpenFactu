import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';

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
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManifests = useCallback(async () => {
    try {
      const token = localStorage.getItem('openfactu_token');
      const fetchHeaders: Record<string, string> = {};
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/plugins/manifests', { headers: fetchHeaders });
      if (!res.ok) {
        console.warn(`Plugin manifests endpoint returned ${res.status}`);
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
        console.error('Plugin manifests: respuesta no es JSON válido', text.slice(0, 200));
        setManifests([]);
      }
    } catch (err) {
      console.error('Error fetching plugin manifests', err);
      setManifests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const reload = useCallback(() => {
    fetchManifests();
  }, [fetchManifests]);

  return (
    <PluginContext.Provider value={{ manifests, loading, reload }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) throw new Error('usePlugins must be used within PluginProvider');
  return context;
};
