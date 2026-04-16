import { useEffect, useState } from 'react';
import type { DocType } from '@openfactu/common';

/**
 * Pequeño bus de eventos global para refrescar listas/detalles entre tabs.
 *
 * Cada "canal" lleva un contador de versión. Cuando una acción muta datos
 * (crear documento, cancelar, etc.) se llama a `notifyDocChange(type)`, que
 * incrementa el contador del canal del tipo + los canales relacionados.
 *
 * Los componentes que fetchean datos usan `useDataVersion(type)` y lo incluyen
 * en las dependencias de su `useEffect` de fetch → se re-ejecuta al detectar
 * cambios aunque estén en otra tab (las tabs inactivas siguen montadas gracias
 * al keep-alive del TabsHost).
 */

type Channel = DocType | 'items' | 'partners' | 'stock';

const versions = new Map<Channel, number>();
const listeners = new Map<Channel, Set<() => void>>();

function bump(channel: Channel) {
  versions.set(channel, (versions.get(channel) ?? 0) + 1);
  const subs = listeners.get(channel);
  if (subs) subs.forEach((fn) => fn());
}

/**
 * Notifica que un documento de tipo `docType` ha cambiado (creado/cancelado/editado).
 * Además del propio canal, incrementa los canales que puedan haberse visto
 * afectados aguas arriba (p.ej. crear un PDN afecta al PO origen).
 */
export function notifyDocChange(docType: DocType) {
  bump(docType);
  // Relaciones upstream: un documento puede mutar el estado de sus base-docs.
  switch (docType) {
    case 'SDN':
      bump('SO'); // el SDN puede cambiar status/deliveredQty del SO origen
      break;
    case 'PDN':
      bump('PO');
      break;
    case 'SINV':
      bump('SDN'); // facturar un albarán cierra el SDN
      break;
    case 'PINV':
      bump('PDN');
      break;
  }
  // Cualquier documento que mueva stock afecta al listado de artículos y stock
  bump('items');
  bump('stock');
}

/** Hook para subscribirse al contador de versión de un canal. */
export function useDataVersion(channel: Channel): number {
  const [v, setV] = useState<number>(() => versions.get(channel) ?? 0);
  useEffect(() => {
    const fn = () => setV(versions.get(channel) ?? 0);
    let set = listeners.get(channel);
    if (!set) {
      set = new Set();
      listeners.set(channel, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
    };
  }, [channel]);
  return v;
}
