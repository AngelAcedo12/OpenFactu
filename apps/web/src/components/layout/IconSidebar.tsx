import React from 'react';
import { cn } from '@openfactu/ui';
import { useModules, useActiveModule } from '../../context/PluginContext';
import { useTabs } from '../../context/TabsContext';
import { PluginIcon } from '../PluginIcon';

/**
 * Sidebar minimal de 60px con un icono por módulo top-level.
 * Hover: scale 1.1 + cambio de color (200ms).
 * El módulo activo se marca con barra lateral a la izquierda + bg.
 */
export const IconSidebar: React.FC = () => {
  const modules = useModules();
  const active = useActiveModule();
  const { openTab } = useTabs();

  const handleClick = (modId: string) => {
    const mod = modules.find((m) => m.id === modId);
    if (!mod || mod.subTabs.length === 0) return;
    openTab(mod.subTabs[0].path);
  };

  return (
    <aside className="w-[60px] flex-shrink-0 flex flex-col items-center bg-slate-900 border-r border-slate-800 py-3 gap-2 z-50">
      {modules.map((mod) => {
        const isActive = active?.id === mod.id;
        return (
          <button
            key={mod.id}
            onClick={() => handleClick(mod.id)}
            title={mod.label}
            aria-label={mod.label}
            className={cn(
              'group relative w-11 h-11 flex items-center justify-center rounded-xl',
              'transition-all duration-200 ease-out',
              'hover:scale-110',
              isActive
                ? 'bg-primary/20 text-primary'
                : 'text-slate-400 hover:bg-slate-800 hover:text-primary',
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
            )}
            <PluginIcon iconName={mod.icon} size={20} />
            {/* Tooltip */}
            <span
              className={cn(
                'absolute left-full ml-2 px-2 py-1 rounded-md',
                'bg-slate-800 text-slate-100 text-xs font-medium whitespace-nowrap',
                'opacity-0 pointer-events-none translate-x-1',
                'group-hover:opacity-100 group-hover:translate-x-0',
                'transition-all duration-150 z-50 shadow-lg',
              )}
            >
              {mod.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
