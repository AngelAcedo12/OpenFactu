import React from 'react';
import { Slot } from '../components/Slot';
import { usePlugins } from '../context/PluginContext';
import { Card, Badge } from '@openfactu/ui';

export const Dashboard: React.FC = () => {
  const { manifests } = usePlugins();

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Resumen de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-2">
            <p className="text-slate-500 text-sm font-medium">Ventas hoy</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">0.00 €</p>
            <div className="mt-2 text-xs text-emerald-600 font-medium">
              ↑ 0% vs ayer
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-2">
            <p className="text-slate-500 text-sm font-medium">Empresas Activadas</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">1</p>
            <div className="mt-2 text-xs text-slate-400 font-medium">
              Suscripción Pro
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-2">
            <p className="text-slate-500 text-sm font-medium">Plugins Instalados</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-3xl font-bold text-slate-900">{manifests.length}</p>
              <Badge variant="success">Activos</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Sección de Actividad */}
      <div className="grid grid-cols-1 gap-8">
        <Card title="Últimas Facturas" description="Listado de transacciones recientes de la empresa.">
          <div className="text-slate-400 text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 uppercase text-xs font-bold tracking-widest">
            No hay transacciones recientes
          </div>
        </Card>
      </div>
      
      <Slot name="dashboard:main:bottom" />
    </div>
  );
};
