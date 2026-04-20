import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Building2 } from 'lucide-react';
import { cn } from '@openfactu/ui';
import { useModules, useActiveModule } from '../../context/PluginContext';
import { useTabs } from '../../context/TabsContext';
import { useAuth } from '../../context/AuthContext';
import { PluginIcon } from '../PluginIcon';
import { TenantSwitcher } from '../TenantSwitcher';

/**
 * Sidebar minimal de 60px:
 *  - Iconos de módulos arriba (hover scale 1.1 + tooltip + cambio color)
 *  - Tenant switcher + avatar/usuario abajo (popovers)
 *  - Adapta colores al tema light/dark
 */
export const IconSidebar: React.FC = () => {
  const allModules = useModules();
  const { openTab, tabs, activeTabId } = useTabs();
  const pathname = tabs.find((t) => t.id === activeTabId)?.path?.split('?')[0] || '/';
  const active = useActiveModule(pathname);
  const { user, logout } = useAuth();
  // Los módulos marcados como superuserOnly solo se muestran al rol SUPERUSER.
  const modules = allModules.filter((m) => !m.superuserOnly || user?.role === 'SUPERUSER');
  // Versión del servidor — `/api/version` es público, no requiere token.
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/version')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setVersion(d?.version || null))
      .catch(() => setVersion(null));
  }, []);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const tenantRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Cerrar popovers al click fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) setTenantOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleClick = (modId: string) => {
    const mod = modules.find((m) => m.id === modId);
    if (!mod || mod.subTabs.length === 0) return;
    openTab(mod.subTabs[0].path);
  };

  return (
    <aside
      className={cn(
        'w-[60px] flex-shrink-0 flex flex-col items-center py-3 z-20',
        'bg-white dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-800',
      )}
    >
      {/* Módulos */}
      <div className="flex-1 flex flex-col items-center gap-1.5 w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  ? 'bg-primary/15 text-primary'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary',
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
                  'bg-slate-900 text-white dark:bg-slate-700 text-xs font-medium whitespace-nowrap',
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
      </div>

      {/* Tenant + Usuario al pie */}
      <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-slate-200 dark:border-slate-800">
        {/* Tenant switcher (popover) */}
        <div className="relative" ref={tenantRef}>
          <button
            onClick={() => {
              setTenantOpen((v) => !v);
              setUserOpen(false);
            }}
            title="Cambiar empresa"
            aria-label="Cambiar empresa"
            className={cn(
              'group relative w-11 h-11 flex items-center justify-center rounded-xl',
              'transition-all duration-200 ease-out hover:scale-110',
              tenantOpen
                ? 'bg-primary/15 text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary',
            )}
          >
            <Building2 size={20} />
          </button>
          {tenantOpen && (
            <div className="absolute bottom-0 left-full ml-2 w-72 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Empresa activa
              </p>
              <TenantSwitcher />
            </div>
          )}
        </div>

        {/* Avatar usuario (popover con info + logout) */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setUserOpen((v) => !v);
              setTenantOpen(false);
            }}
            title={user?.username || 'Usuario'}
            aria-label="Menú de usuario"
            className={cn(
              'group relative w-10 h-10 flex items-center justify-center rounded-full',
              'transition-all duration-200 ease-out hover:scale-110',
              'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
              'border-2',
              userOpen ? 'border-primary' : 'border-transparent',
            )}
          >
            <span className="text-xs font-bold">
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </button>
          {userOpen && (
            <div className="absolute bottom-0 left-full ml-2 w-56 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
              <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.username || 'Administrador'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || ''}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {user?.role || 'USER'}
                </span>
              </div>
              <button
                onClick={() => {
                  setUserOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Keirost</span>
                <span>v{version || '…'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
