import React, { type ReactNode } from 'react';

// Simplificación extrema de un Slot para el core.
// Los plugins podrían inyectar componentes en un contexto global
// y este Slot los renderizaría buscando por "name".

interface SlotProps {
  name: string;
  children?: ReactNode; // Contenido por defecto (fallback) si no hay plugin
}

// Simulamos un registro global de inyecciones (Idealmente iría por Provider/Context)
export const PluginRegistry: Record<string, React.FC[]> = {};

export const Slot: React.FC<SlotProps> = ({ name, children }) => {
  const InjectedComponents = PluginRegistry[name] || [];

  if (InjectedComponents.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      {InjectedComponents.map((Component, index) => (
        <Component key={index} />
      ))}
      {children}
    </>
  );
};
