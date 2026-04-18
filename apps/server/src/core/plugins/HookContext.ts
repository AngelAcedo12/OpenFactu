export interface HookContext {
  tenantId: string;
  db: any; // El cliente de Drizzle (transacción o normal)
  data: any; // Los datos del documento
  user?: any;
  [key: string]: any;
}

export type HookResult = void | Promise<void>;

/**
 * Contexto para hooks de tipo `<entity>.list.afterFetch`.
 * Permite a plugins inyectar/mutar las filas devueltas por listados core.
 *
 * El handler puede:
 *  - Mutar `ctx.rows` directamente (push, splice, etc.)
 *  - Reasignar la propiedad si quiere reemplazar el array completo
 *
 * Ejemplo en un plugin:
 *   ctx.hooks.register('items.list.afterFetch', async (c) => {
 *     c.rows = c.rows.concat(await fetchMyExtraItems(c.tenantId));
 *   });
 */
export interface ListFetchContext<T = any> {
  tenantId: string;
  /** Identificador del listado: 'items', 'partners', etc. */
  entity: string;
  /** Filtros aplicados al fetch core (search, status, etc.). */
  filters: Record<string, any>;
  /** Filas devueltas por el core. El handler puede mutar o reasignar. */
  rows: T[];
  /** Cliente Drizzle del tenant (por si el plugin quiere consultar la BD). */
  db?: any;
}
