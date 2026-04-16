import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabs } from '../../context/TabsContext';

interface TabBridgeProps {
  tabId: string;
}

export const TabBridge: React.FC<TabBridgeProps> = ({ tabId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, updateTabPath } = useTabs();
  const tab = tabs.find((t) => t.id === tabId);

  // Internal → External: cuando el router interno navega, actualizamos la tab.
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    updateTabPath(tabId, fullPath);
  }, [location.pathname, location.search, tabId, updateTabPath]);

  // External → Internal: cuando alguien llama openTab/updateTabPath con una
  // ruta distinta para una tab ya existente, forzamos la navegación interna
  // del MemoryRouter para que el componente reaccione (p.ej. para leer un
  // nuevo ?copyFrom en el caso de "Generar Albarán" desde un pedido).
  useEffect(() => {
    if (!tab) return;
    const currentInternal = location.pathname + location.search;
    if (tab.path !== currentInternal) {
      navigate(tab.path, { replace: true });
    }
    // Deliberadamente sólo reaccionamos a cambios de tab.path para evitar loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.path]);

  return null;
};
