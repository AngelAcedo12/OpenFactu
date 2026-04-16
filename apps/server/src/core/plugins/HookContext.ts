export interface HookContext {
  tenantId: string;
  db: any; // El cliente de Drizzle (transacción o normal)
  data: any; // Los datos del documento
  user?: any;
  [key: string]: any;
}

export type HookResult = void | Promise<void>;
