import React from 'react';
import { Card } from '@openfactu/ui';
import { useDashboardWidgets } from '../../context/PluginContext';
import { PluginComponentLoader } from './PluginComponentLoader';

const SIZE_TO_COLS: Record<string, string> = {
  sm: 'lg:col-span-1',
  md: 'lg:col-span-2',
  lg: 'lg:col-span-3',
  full: 'lg:col-span-4',
};

/**
 * Renderiza todos los widgets que los plugins hayan declarado en su manifest
 * (`ui.dashboardWidgets`). Cada widget aparece como un Card con el componente
 * ESM del plugin cargado dinámicamente.
 */
export const DashboardPluginWidgets: React.FC = () => {
  const widgets = useDashboardWidgets();
  if (widgets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {widgets.map((w) => (
        <div key={`${w.pluginId}__${w.id}`} className={SIZE_TO_COLS[w.size || 'md']}>
          <Card title={w.title} subtitle={w.subtitle}>
            <PluginComponentLoader pluginId={w.pluginId} componentPath={w.component} />
          </Card>
        </div>
      ))}
    </div>
  );
};
