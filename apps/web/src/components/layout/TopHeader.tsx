import React from 'react';
import { Boxes, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { GlobalSearch } from '../GlobalSearch';

/**
 * Header superior compacto: logo + branding, búsqueda global, toggle tema.
 *
 * El tenant switcher y el menú de usuario ahora viven en el IconSidebar (al pie).
 */
export const TopHeader: React.FC = () => {
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

      {/* Toggle tema */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        aria-label="Cambiar tema"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
};
