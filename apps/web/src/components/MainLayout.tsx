import { 
  LayoutDashboard, 
  Puzzle, 
  Settings, 
  Eye, 
  ChevronRight,
  ChevronDown,
  LogOut,
  Users as UsersIcon,
  Zap,
  Package,
  Layers,
  Hash
} from 'lucide-react';
import { NavItem } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Outlet, useLocation } from 'react-router-dom';
import { usePlugins } from '../context/PluginContext';
import { useState } from 'react';

export const MainLayout: React.FC = () => {
  const { manifests } = usePlugins();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    general: true,
    inventario: true,
    extensiones: true,
    herramientas: false
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Fija y Moderna */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 z-50 border-r border-slate-800 shadow-2xl">
        <div className="p-6 text-white font-bold text-xl flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 ring-1 ring-white/20">
            <span className="text-white">O</span>
          </div>
          <div className="flex flex-col">
            <span className="tracking-tight leading-none">OpenFactu</span>
            <span className="text-[10px] text-blue-400 font-medium tracking-widest mt-1 uppercase">ERP Core</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Grupo General */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleGroup('general')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              <span>Gestión Central</span>
              {openGroups.general ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            
            {openGroups.general && (
              <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <NavItem label="Dashboard" path="/" icon={LayoutDashboard} isActive={isActive('/')} />
                <NavItem label="Plugins" path="/plugins" icon={Settings} isActive={isActive('/plugins')} />
                {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                  <NavItem label="Usuarios" path="/users" icon={UsersIcon} isActive={isActive('/users')} />
                )}
              </div>
            )}
          </div>

          {/* Grupo Inventario */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleGroup('inventario')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              <span>Inventario</span>
              {openGroups.inventario ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            
            {openGroups.inventario && (
              <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <NavItem label="Catálogo" path="/items" icon={Package} isActive={isActive('/items')} />
                <NavItem label="Categorías" path="/categories" icon={Layers} isActive={isActive('/categories')} />
                <NavItem label="Unidades" path="/uom" icon={Hash} isActive={isActive('/uom')} />
              </div>
            )}
          </div>

          {/* Grupo Extensiones (Dinámico) */}
          {manifests.length > 0 && (
            <div className="space-y-1">
              <button 
                onClick={() => toggleGroup('extensiones')}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
              >
                <span>Extensiones</span>
                {openGroups.extensiones ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              
              {openGroups.extensiones && (
                <div className="mt-1 space-y-1">
                  {manifests.map(m => 
                    m.ui.menuItems.map(item => (
                      <NavItem 
                        key={`${m.id}-${item.path}`}
                        label={item.label} 
                        path={item.path} 
                        icon={Puzzle} 
                        isActive={isActive(item.path)} 
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grupo Herramientas Peligrosas / Desarrollo */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleGroup('herramientas')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              <span>Soporte & Dev</span>
              {openGroups.herramientas ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            
            {openGroups.herramientas && (
              <div className="mt-1 space-y-1">
                <NavItem label="Style Guide" path="/ui" icon={Eye} isActive={isActive('/ui')} />
                <div className="px-3 py-2 text-[10px] text-slate-600 font-mono bg-slate-950/50 rounded-lg border border-slate-800/50 mt-2">
                  Build: v0.1.0-alpha.dev
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Perfil de Usuario Dinámico */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold text-white shadow-inner uppercase">
                {user?.username?.substring(0, 2) || '??'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.username || 'Usuario'}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider truncate">
                {user?.tenantName || user?.role || 'Acceso'}
              </p>
            </div>
            <button 
              onClick={logout}
              className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 hover:bg-rose-400/10 rounded-lg"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col ml-64 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 !sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <div className="p-1 px-2 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200">Core</div>
              <ChevronDown size={14} className="-rotate-90" />
              <span className="text-sm font-semibold text-slate-600">
                {location.pathname === '/' ? 'Vista General' : location.pathname.substring(1).split('/').pop()?.replace('-', ' ')}
              </span>
            </div>
            
            {user?.tenantName && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">
                  {user.tenantName}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            {/* Presencia Colaborativa */}
            <div className="flex items-center gap-2 group cursor-help" title="Colaboradores en línea">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm uppercase">JS</div>
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                  +3
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block group-hover:text-blue-500 transition-colors">Equipo</span>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            {/* Acciones Rápidas / Notificaciones */}
            <button className="relative group p-2 text-slate-400 hover:text-blue-600 transition-all bg-slate-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100">
              <Zap size={20} className="group-hover:scale-110 transition-transform" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-bounce" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
