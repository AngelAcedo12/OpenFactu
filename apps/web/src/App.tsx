import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalLoader } from '@openfactu/ui';
import { SetupWizard } from './pages/SetupWizard';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';
import { MainLayout } from './components/MainLayout';
import { TabsProvider } from './context/TabsContext';
import { DebugPanel } from './components/DebugPanel';

function App() {
  const [setupChecked, setSetupChecked] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        // `?force=1` en la URL del front fuerza al backend a devolver
        // setupNeeded=true. Útil para volver a ver el wizard sin haber tirado
        // los tenants (modo debug).
        const force = new URLSearchParams(window.location.search).get('force') === '1';
        const res = await fetch(
          `/api/setup/status?t=${Date.now()}${force ? '&force=1' : ''}`,
        );
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
        <GlobalLoader isLoading={true} message="Keirost ERP | Cargando Sistema…" />
      </div>
    );
  }

  if (setupNeeded) {
    return (
      <>
        <BrowserRouter>
          <Routes>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Routes>
        </BrowserRouter>
        <DebugPanel />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <DebugPanel />
      </>
    );
  }

  return (
    <>
      <TabsProvider>
        <MainLayout />
      </TabsProvider>
      <DebugPanel />
    </>
  );
}

export default App;
