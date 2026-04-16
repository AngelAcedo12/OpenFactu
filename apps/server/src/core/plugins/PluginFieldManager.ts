import { ClientFactory } from '../tenant/ClientFactory';
import { TenantPluginCache } from './TenantPluginCache';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class PluginFieldManager {
  /**
   * Valida y filtra los campos de plugin recibidos en el body.
   * Solo retorna aquellos que existen, coinciden en tipo, y cuyo plugin
   * está activo para el tenant (si se proporciona tenantId).
   */
  public static async validateAndExtract(
    tableName: string,
    body: any,
    tenantId?: string,
  ): Promise<Record<string, any>> {
    const publicDb = ClientFactory.getClient('public');

    // 1. Obtener la definición de campos para esta tabla
    let definitions = await publicDb
      .select()
      .from(schema.pluginFields)
      .where(eq(schema.pluginFields.tableName, tableName));

    // 2. Filtrar por plugins activos del tenant
    if (tenantId) {
      definitions = definitions.filter(
        (def) => TenantPluginCache.isActive(tenantId, def.pluginId),
      );
    }

    const extracted: Record<string, any> = {};

    for (const def of definitions) {
      const value = body[def.fieldName];
      if (value !== undefined) {
        // Validación básica de tipos
        if (this.isValidType(value, def.fieldType)) {
          extracted[def.fieldName] = value;
        } else {
          console.warn(
            `[PluginFieldManager] Tipo inválido para ${def.fieldName}. Esperado: ${def.fieldType}, Recibido: ${typeof value}`,
          );
        }
      }
    }

    return extracted;
  }

  private static isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'TEXT':
        return typeof value === 'string';
      case 'INTEGER':
        return Number.isInteger(Number(value));
      case 'DECIMAL':
        return !isNaN(parseFloat(value));
      case 'BOOLEAN':
        return typeof value === 'boolean';
      case 'JSONB':
        return typeof value === 'object';
      default:
        return true;
    }
  }
}
