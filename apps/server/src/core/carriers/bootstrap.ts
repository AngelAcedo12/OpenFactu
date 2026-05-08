/**
 * Registra los adapters disponibles al arranque. Si mañana añades un adapter
 * Seur/DHL/etc., importa su archivo e invoca `CarrierRegistry.register`.
 */

import { CarrierRegistry } from './CarrierRegistry';
import { ManualAdapter } from './adapters/ManualAdapter';

let initialized = false;

export function bootstrapCarrierAdapters() {
  if (initialized) return;
  // `registerIfAbsent` respeta adapters que los plugins hayan registrado
  // primero (p. ej. un plugin que aporta su propia variante de "manual").
  CarrierRegistry.registerIfAbsent(ManualAdapter);
  // Futuros adapters del core irán igual:
  //   CarrierRegistry.registerIfAbsent(SeurAdapter);
  //   CarrierRegistry.registerIfAbsent(DhlExpressAdapter);
  initialized = true;
}
