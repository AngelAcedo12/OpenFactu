import React, { createContext, useContext, useEffect, useState } from 'react';

interface PluginManifest {
  id: string;
  name: string;
  logo?: string; // Icono de Lucide o URL base64/path
  ui: {
    routes: Array<{
      path: string;
      title: string;
      type: 'table' | 'form' | 'custom';
      icon?: string; // Icono específico para este menú
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
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManifests = async () => {
      try {
        const res = await fetch('/api/plugins/manifests');
        const data = await res.json();
        setManifests(data);
      } catch (err) {
        console.error('Error fetching plugin manifests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManifests();
  }, []);

  return (
    <PluginContext.Provider value={{ manifests, loading }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) throw new Error('usePlugins must be used within PluginProvider');
  return context;
};
