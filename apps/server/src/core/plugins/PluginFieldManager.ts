import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class PluginFieldManager {
    /**
     * Valida y filtra los campos de plugin recibidos en el body.
     * Solo retorna aquellos que existen y coinciden en tipo.
     */
    public static async validateAndExtract(tableName: string, body: any): Promise<Record<string, any>> {
        const publicDb = ClientFactory.getClient('public');
        
        // 1. Obtener la definición de campos para esta tabla
        const definitions = await publicDb.select()
            .from(schema.pluginFields)
            .where(eq(schema.pluginFields.tableName, tableName));

        const extracted: Record<string, any> = {};

        for (const def of definitions) {
            const value = body[def.fieldName];
            if (value !== undefined) {
                // Validación básica de tipos
                if (this.isValidType(value, def.fieldType)) {
                    extracted[def.fieldName] = value;
                } else {
                    console.warn(`[PluginFieldManager] Tipo inválido para ${def.fieldName}. Esperado: ${def.fieldType}, Recibido: ${typeof value}`);
                }
            }
        }

        return extracted;
    }

    private static isValidType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'TEXT': return typeof value === 'string';
            case 'INTEGER': return Number.isInteger(Number(value));
            case 'DECIMAL': return !isNaN(parseFloat(value));
            case 'BOOLEAN': return typeof value === 'boolean';
            case 'JSONB': return typeof value === 'object';
            default: return true;
        }
    }
}
