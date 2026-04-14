import React from 'react';
import { Slot } from '../components/Slot';
import { usePlugins } from '../context/PluginContext';
import { Card, Badge } from '@openfactu/ui';
import { 
  TrendingUp, 
  Package, 
  Users, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight,
  ShoppingCart,
  Zap,
  ChevronRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { manifests } = usePlugins();

  const metrics = [
    { 
      label: 'Ventas del Día', 
      value: '14,250.00 €', 
      trend: '+12.5%', 
      icon: TrendingUp, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: 'Artículos en Stock', 
      value: '1,245', 
      trend: '+3 nuevos', 
      icon: Package, 
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Clientes Activos', 
      value: '48', 
      trend: '6 pendientes', 
      icon: Users, 
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    { 
      label: 'Alertas Sistema', 
      value: '2', 
      trend: 'Criticas', 
      icon: AlertTriangle, 
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-10 animate-in fade-in duration-700">
      {/* Header Corporativo */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter font-display">
            Business Overview
          </h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            Lunes, 13 de Abril de 2026 · <span className="text-blue-600">Periodo Contable Abierto</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="success" className="px-3 py-1 text-[10px] font-black uppercase">Sistema Sincronizado</Badge>
          <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
        </div>
      </header>

      {/* Grid de Métricas de Alta Densidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <Card key={i} className="relative group transition-all hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">{m.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{m.value}</p>
                <p className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${m.color}`}>
                  <ArrowUpRight size={12} /> {m.trend}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${m.bg} ${m.color} shadow-inner`}>
                <m.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel Principal: Transacciones */}
        <div className="lg:col-span-8 space-y-8">
          <Card 
            title="Actividad Reciente de Almacén" 
            subtitle="Últimos movimientos y asignaciones de bins generados masivamente."
            headerAction={<Button variant="secondary" size="sm">Ver todo</Button>}
            noPadding
          >
            <div className="p-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                <ShoppingCart size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 tracking-tight">Cero transacciones en el periodo actual</p>
                <p className="text-xs text-slate-400 font-medium">Empieza registrando una compra o ajustando el stock de apertura.</p>
              </div>
              <Button size="sm" className="mt-4">Registrar Movimiento</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Card title="Alertas de Trazabilidad" subtitle="Artículos gestionados por serie con irregularidades.">
                <div className="flex items-center gap-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <div className="p-2 bg-rose-600 text-white rounded-lg shadow-md">
                    <Zap size={16} />
                  </div>
                  <p className="text-xs font-bold text-rose-700">Auditando consistencia de lotes...</p>
                </div>
             </Card>
             <Card title="Capacidad de Bodega" subtitle="Ocupación por zonas logísticas activas.">
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500">
                      <span>Almacén Central</span>
                      <span>12%</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[12%] rounded-full shadow-inner" />
                   </div>
                </div>
             </Card>
          </div>
        </div>

        {/* Barra Lateral: Estado de Extensiones */}
        <aside className="lg:col-span-4 space-y-8">
          <Card 
            title="Ecosistema de Plugins" 
            subtitle="Estado de los servicios inyectados en el core."
            className="border-slate-100 bg-slate-50/50"
          >
             <div className="space-y-4">
               {manifests.length > 0 ? manifests.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
                 </div>
               )) : (
                 <p className="text-xs text-slate-400 italic">No hay plugins activos</p>
               )}
             </div>
          </Card>

          <Card title="Recursos Directos" className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-none shadow-blue-900/40">
            <div className="space-y-3">
               <p className="text-xs font-medium opacity-80">Documentación y Soporte Premium habilitado para este tenant.</p>
               <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all border border-white/10">
                  Acceder a Base de Conocimiento
               </button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Slots para extensibilidad total */}
      <Slot name="dashboard:main:bottom" />
    </div>
  );
};

// Componente simple de botón para el Dashboard (puede ser movido a packages/ui después)
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary', size?: 'sm' | 'md' }> = ({ children, className, variant = 'primary', size = 'md', ...props }) => (
   <button 
     className={`
       ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
       ${size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-sm'}
       font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50
       ${className}
     `}
     {...props}
   >
     {children}
   </button>
);
