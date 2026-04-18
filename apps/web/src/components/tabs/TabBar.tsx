import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@openfactu/ui';
import { useTabs } from '../../context/TabsContext';

const resolveIcon = (name?: string): React.ComponentType<any> => {
  if (name && (LucideIcons as any)[name]) return (LucideIcons as any)[name];
  return LucideIcons.FileText;
};

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(id);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      className="flex items-stretch h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide shrink-0 z-0"
    >
      {tabs.map((tab) => {
        const Icon = resolveIcon(tab.iconName);
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => handleMouseDown(e, tab.id)}
            className={cn(
              'group relative flex items-center gap-2 pl-3 pr-2 h-full min-w-[140px] max-w-[240px] cursor-pointer border-r border-slate-200 dark:border-slate-800 transition-colors shrink-0 select-none',
              isActive
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50',
            )}
          >
            {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />}
            <Icon size={14} className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
            <span className="flex-1 truncate text-xs font-semibold tracking-tight">
              {tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Cerrar pestaña"
              tabIndex={-1}
            >
              <LucideIcons.X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
