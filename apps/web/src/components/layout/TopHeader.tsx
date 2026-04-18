import React from 'react';
import { Boxes, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@openfactu/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TenantSwitcher } from '../TenantSwitcher';
import { GlobalSearch } from '../GlobalSearch';

/**
 * Header superior con: logo + branding, búsqueda global, tenant switcher,
 * toggle tema, y avatar/usuario con logout.
 *
 * Reemplaza la sección de logo+search del header viejo y mueve aquí los
 * controles que estaban en la parte inferior del sidebar.
 */
export const TopHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { branding, update } = useTheme();
  const isDark = branding.themeMode === 'dark';
  const toggleTheme = () =>
    update('branding', { themeMode: isDark ? 'light' : 'dark' });

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-4 z-40">
      {/* Logo + nombre */}
      <div className="flex items-center gap-2 mr-4">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.appName}
            className="w-7 h-7 rounded-lg object-cover"
          />
        ) : (
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Boxes className="text-primary-fg" size={16} />
          </div>
        )}
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {branding.appName}
        </span>
      </div>

      {/* Búsqueda global */}
      <div className="flex-1 max-w-xl">
        <GlobalSearch />
      </div>

      {/* Tenant switcher */}
      <div className="hidden md:block">
        <TenantSwitcher />
      </div>

      {/* Toggle tema */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        aria-label="Cambiar tema"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Avatar + usuario + logout */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-xs font-bold text-white">
            {user?.username?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
            {user?.username || 'Admin'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {user?.role || 'USER'}
          </p>
        </div>
        <button
          onClick={logout}
          className={cn(
            'p-2 rounded-md text-slate-400 dark:text-slate-500',
            'hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10',
            'transition-colors',
          )}
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
