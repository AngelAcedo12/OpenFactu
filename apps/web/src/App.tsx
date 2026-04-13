import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { SetupWizard } from './pages/SetupWizard';
import { StyleGuide } from './pages/StyleGuide';
import { PluginManager } from './pages/PluginManager';
import { Login } from './pages/Login';
import { Users } from './pages/Users';
import { Items } from './pages/Items';
import { Categories } from './pages/Categories';
import { Uom } from './pages/Uom';
import { PluginViewRenderer } from './pages/PluginViewRenderer';
import { usePlugins } from './context/PluginContext';
import { useAuth } from './context/AuthContext';
import { MainLayout } from './components/MainLayout';

function App() {
  const [setupChecked, setSetupChecked] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const { manifests } = usePlugins();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch(`/api/setup/status?t=${Date.now()}`);
        if (!res.ok) throw new Error('Servidor no disponible');
        const data = await res.json();
        console.log('[App] Setup Status:', data);
        setSetupNeeded(data.setupNeeded);
        setSetupChecked(true);
      } catch (err) {
        console.error('Error checking setup status', err);
        setSetupChecked(true);
      }
    };
    checkSetup();
  }, []);

  if (!setupChecked || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-pulse text-blue-500 font-bold tracking-widest uppercase text-xs">Cargando OpenFactu...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Si se necesita configuración inicial, forzar el Setup Wizard como única opción */}
        {setupNeeded ? (
          <>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            {/* El Login solo es accesible si el sistema ya está configurado */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />

            {/* Rutas Protegidas (Requieren Login) */}
            <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="items" element={<Items />} />
              <Route path="categories" element={<Categories />} />
              <Route path="uom" element={<Uom />} />
              <Route path="ui" element={<StyleGuide />} />
              <Route path="plugins" element={<PluginManager />} />
              
              {/* Rutas Dinámicas de Plugins */}
              {manifests.map((m) => 
                m.ui.routes.map((route) => (
                  <Route 
                    key={`${m.id}-${route.path}`} 
                    path={route.path.startsWith('/') ? route.path.substring(1) : route.path} 
                    element={
                      <PluginViewRenderer 
                        pluginId={m.id}
                        type={route.type} 
                        config={route.config} 
                        title={route.title} 
                      />
                    } 
                  />
                ))
              )}
              
              {/* Si intentas ir a /setup ya configurado, te manda al inicio */}
              <Route path="setup" element={<Navigate to="/" replace />} />
            </Route>

            {/* Fallback general para sistema ya configurado */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
