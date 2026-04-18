import React from 'react';
import { cn } from '@openfactu/ui';
import { useActiveModule } from '../../context/PluginContext';
import { useTabs } from '../../context/TabsContext';
import { PluginIcon } from '../PluginIcon';

/**
 * Barra horizontal de sub-tabs del módulo activo.
 * Aparece justo debajo del TopHeader y antes del TabBar de pestañas dinámicas.
 */
export const ModuleTabBar: React.FC = () => {
  const active = useActiveModule();
  const { openTab, tabs, activeTabId } = useTabs();
  const activeTabPath = tabs.find((t) => t.id === activeTabId)?.path?.split('?')[0] || '/';

  if (!active || active.subTabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-3 px-2">
        {active.label}
      </span>
      {active.subTabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        return (
          <button
            key={tab.id}
            onClick={() => openTab(tab.path)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap',
              'transition-colors duration-150',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            {tab.icon && <PluginIcon iconName={tab.icon} size={14} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
