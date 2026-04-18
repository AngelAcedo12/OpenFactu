import React from 'react';
import { TabBar } from './tabs/TabBar';
import { TabsHost } from './tabs/TabsHost';
import { IconSidebar } from './layout/IconSidebar';
import { TopHeader } from './layout/TopHeader';
import { ModuleTabBar } from './layout/ModuleTabBar';

/**
 * Layout principal estilo Odoo:
 *   - IconSidebar (60px) — módulos top-level con iconos
 *   - TopHeader — branding, búsqueda, tenant, tema, usuario
 *   - ModuleTabBar — sub-tabs del módulo activo
 *   - TabBar — pestañas dinámicas (TabsContext)
 *   - TabsHost — render de la página actual
 */
export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <IconSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <ModuleTabBar />
        <TabBar />
        <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-0">
          <TabsHost />
        </main>
      </div>
    </div>
  );
};
