import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalLoader } from '@openfactu/ui';
import { Dashboard } from './pages/Dashboard';
import { SetupWizard } from './pages/SetupWizard';
import { StyleGuide } from './pages/StyleGuide';
import { PluginManager } from './pages/PluginManager';
import { Login } from './pages/Login';
import { Users } from './pages/Users';
import { Items } from './pages/Items';
import { Categories } from './pages/Categories';
import { Uom } from './pages/Uom';
import { PriceLists } from './pages/PriceLists';
import { Warehouses } from './pages/Warehouses';
import { Zones } from './pages/Zones';
import { Partners } from './pages/Partners';
import { PartnerGroups } from './pages/PartnerGroups';
import { AccountingPeriods } from './pages/AccountingPeriods';
import { DocumentSeries } from './pages/DocumentSeries';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { PurchaseDeliveryNotes } from './pages/PurchaseDeliveryNotes';
import { PurchaseInvoices } from './pages/PurchaseInvoices';
import { SalesOrders } from './pages/SalesOrders';
import { SalesDeliveryNotes } from './pages/SalesDeliveryNotes';
import { SalesInvoices } from './pages/SalesInvoices';
import { Taxes } from './pages/Taxes';
import { AuditLogs } from './pages/AuditLogs';
import { DocumentTemplates } from './pages/DocumentTemplates';
import { CompanySettings } from './pages/CompanySettings';
import { NewCompany } from './pages/NewCompany';
import { PluginViewRenderer } from './pages/PluginViewRenderer';
import { usePlugins } from './context/PluginContext';
import { useAuth } from './context/AuthContext';
import { MainLayout } from './components/MainLayout';

const PermittedRoute = ({ path, element }: { path: string, element: React.ReactElement }) => {
  const { user } = useAuth();
  if (user?.role === 'SUPERUSER' || user?.role === 'ADMIN') return element;
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (user?.permissions?.[normalizedPath]?.read) return element;
  
  return <Navigate to="/" replace />;
};

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
        <GlobalLoader isLoading={true} message="Firmwares Industriales | Cargando Sistema..." />
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
              <Route path="users" element={<PermittedRoute path="/users" element={<Users />} />} />
              <Route path="items" element={<PermittedRoute path="/items" element={<Items />} />} />
              <Route path="categories" element={<PermittedRoute path="/categories" element={<Categories />} />} />
              <Route path="uom" element={<PermittedRoute path="/uom" element={<Uom />} />} />
              <Route path="pricelists" element={<PermittedRoute path="/pricelists" element={<PriceLists />} />} />
              <Route path="warehouses" element={<PermittedRoute path="/warehouses" element={<Warehouses />} />} />
              <Route path="partners" element={<PermittedRoute path="/partners" element={<Partners />} />} />
              <Route path="partner-groups" element={<PermittedRoute path="/partner-groups" element={<PartnerGroups />} />} />
              <Route path="accounting-periods" element={<PermittedRoute path="/accounting-periods" element={<AccountingPeriods />} />} />
              <Route path="document-series" element={<PermittedRoute path="/document-series" element={<DocumentSeries />} />} />
              <Route path="document-templates" element={<PermittedRoute path="/document-templates" element={<DocumentTemplates />} />} />
              <Route path="settings/company" element={<PermittedRoute path="/settings/company" element={<CompanySettings />} />} />
              <Route path="companies/new" element={<PermittedRoute path="/companies/new" element={<NewCompany />} />} />
              <Route path="purchase-orders" element={<PermittedRoute path="/purchase-orders" element={<PurchaseOrders />} />} />
              <Route path="purchases/delivery-notes" element={<PermittedRoute path="/purchases/delivery-notes" element={<PurchaseDeliveryNotes />} />} />
              <Route path="purchases/invoices" element={<PermittedRoute path="/purchases/invoices" element={<PurchaseInvoices />} /> } />
              <Route path="sales-orders" element={<PermittedRoute path="/sales-orders" element={<SalesOrders />} />} />
              <Route path="sales/delivery-notes" element={<PermittedRoute path="/sales/delivery-notes" element={<SalesDeliveryNotes />} />} />
              <Route path="sales/invoices" element={<PermittedRoute path="/sales/invoices" element={<SalesInvoices />} />} />
              <Route path="taxes" element={<PermittedRoute path="/taxes" element={<Taxes />} />} />
              <Route path="audit-logs" element={<PermittedRoute path="/audit-logs" element={<AuditLogs />} />} />
              <Route path="ui" element={<PermittedRoute path="/ui" element={<StyleGuide />} />} />
              <Route path="plugins" element={<PermittedRoute path="/plugins" element={<PluginManager />} />} />
              
              {/* Rutas Dinámicas de Plugins */}
              {manifests.map((m) => 
                m.ui?.routes?.map((route) => (
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
