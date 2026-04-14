import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Package, 
  Settings, 
  MapPin, 
  Users, 
  LogOut, 
  Layers, 
  ChevronDown, 
  ChevronRight,
  Database,
  Grid,
  Hash,
  Boxes,
  Zap,
  Cpu,
  Terminal,
  ExternalLink,
  Network,
  Calendar,
  FileDigit,
  ShoppingCart,
  Truck,
  FileStack,
  Percent
} from 'lucide-react';
import { cn, NavGroup } from '@openfactu/ui';

interface NavItemProps {
  icon: any;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, path, isActive, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
      isActive 
        ? "bg-blue-600/10 text-blue-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-blue-500/10" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
      className
    )}
  >
    {isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
    )}
    <Icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-blue-500" : "opacity-70")} />
    <span className="truncate">{label}</span>
    {!isActive && (
      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={12} className="text-slate-600" />
      </div>
    )}
  </button>
);

export const MainLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    central: true,
    inventario: true,
    compras: true,
    ventas: true,
    terceros: true,
    finanzas: true,
    extensiones: false,
    soporte: false
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const menuItems = [
    { group: 'central', icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    { group: 'central', icon: Layers, label: 'Plugins', path: '/plugins' },
    { group: 'central', icon: Users, label: 'Usuarios', path: '/users' },
    { group: 'central', icon: Zap, label: 'Tarifas', path: '/pricelists' },
    { group: 'inventario', icon: Grid, label: 'Catálogo', path: '/items' },
    { group: 'inventario', icon: Hash, label: 'Categorías', path: '/categories' },
    { group: 'inventario', icon: MapPin, label: 'Gestión Bins', path: '/warehouses' },
    { group: 'inventario', icon: Boxes, label: 'Unidades', path: '/uom' },
    { group: 'compras', icon: FileDigit, label: 'Pedidos', path: '/purchase-orders' },
    { group: 'compras', icon: Truck, label: 'Albaranes', path: '/purchases/delivery-notes' },
    { group: 'compras', icon: FileStack, label: 'Facturas', path: '/purchases/invoices' },
    { group: 'ventas', icon: FileDigit, label: 'Pedidos', path: '/sales-orders' },
    { group: 'ventas', icon: Truck, label: 'Albaranes', path: '/sales/delivery-notes' },
    { group: 'ventas', icon: FileStack, label: 'Facturas', path: '/sales/invoices' },
    { group: 'terceros', icon: Network, label: 'Grupos', path: '/partner-groups' },
    { group: 'terceros', icon: Users, label: 'Directorio', path: '/partners' },
    { group: 'finanzas', icon: Calendar, label: 'Periodos', path: '/accounting-periods' },
    { group: 'finanzas', icon: Percent, label: 'Impuestos', path: '/taxes' },
    { group: 'finanzas', icon: FileDigit, label: 'Series Doc.', path: '/document-series' },
    { group: 'extensiones', icon: Terminal, label: 'Dev Console', path: '/ui' },
  ];

  const filteredItems = menuItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groups = [
    { id: 'central', label: 'Gestión Central', icon: Cpu },
    { id: 'inventario', label: 'Logística & Stock', icon: Database },
    { id: 'compras', label: 'Compras', icon: ShoppingCart },
    { id: 'ventas', label: 'Ventas', icon: Cpu },
    { id: 'terceros', label: 'Interlocutores', icon: Users },
    { id: 'finanzas', label: 'Finanzas & Setup', icon: Database },
    { id: 'extensiones', label: 'Extensiones', icon: Zap },
    { id: 'soporte', label: 'Soporte & Dev', icon: Terminal },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar de Alta Gama */}
      <aside className="w-64 flex flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-50">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group cursor-pointer transition-transform hover:rotate-3">
              <Boxes className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-none tracking-tighter font-display">OpenFactu</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Enterprise v2</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
           <div className="relative group/search">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <svg className="h-3.5 w-3.5 text-slate-500 group-focus-within/search:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
             </div>
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Buscar en menú..." 
               className="block w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
             />
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1 py-4 scrollbar-hide">
          {groups.map(group => {
            const itemsInGroup = filteredItems.filter(i => i.group === group.id);
            if (itemsInGroup.length === 0 && group.id !== 'soporte') return null;
            
            const isGroupOpen = searchQuery ? true : openGroups[group.id];

            return (
              <NavGroup 
                key={group.id}
                id={group.id} 
                label={group.label} 
                icon={group.icon} 
                isOpen={isGroupOpen} 
                onToggle={toggleGroup}
              >
                {itemsInGroup.map(item => (
                  <NavItem 
                    key={item.path}
                    icon={item.icon} 
                    label={item.label} 
                    path={item.path} 
                    isActive={isActive(item.path)} 
                    onClick={() => navigate(item.path)} 
                  />
                ))}
                {group.id === 'soporte' && !searchQuery && (
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all">
                    <ExternalLink size={18} className="opacity-70" />
                    <span>Documentación</span>
                  </button>
                )}
              </NavGroup>
            );
          })}
        </nav>

        {/* Profile Section Premium */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center justify-between group p-2 rounded-2xl hover:bg-slate-900 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-inner border border-white/5">
                  {user?.username?.charAt(0) || 'A'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-100 truncate tracking-tight">{user?.username || 'Administrador'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-widest">{user?.tenantName || 'OpenFactu Core'}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 justify-between z-40 shadow-sm shadow-slate-200/50">
          <div className="flex items-center gap-4 flex-1">

             
             {/* Global Search Bar */}
             <div className="max-w-md w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Buscar interlocutores, artículos o documentos (Ctrl+K)..." 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Quick Actions Dropdown (Static for now) */}
             <div className="relative">
                <button onClick={() => navigate('/purchase-orders')} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95">
                   <FileDigit size={16} />
                   <span>Nuevo Pedido</span>
                   <ChevronRight size={14} className="opacity-70 ml-1" />
                </button>
             </div>

             <div className="h-5 w-[1px] bg-slate-200" />

             {/* Notifications */}
             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
                <Zap size={20} />
                <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 border-2 border-white rounded-full" />
             </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-50/30">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Componente simple de Badge para el header si no está en @openfactu/ui
const Badge = ({ label, color }: { label: string, color: string }) => (
  <div className={cn(
    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em]",
    color === 'emerald' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500"
  )}>
    {label}
  </div>
);
