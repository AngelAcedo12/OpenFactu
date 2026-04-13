import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

interface CustomFieldRequest {
  pluginId: string;
  tableName: string;
  fieldName: string;
  fieldType: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB';
  label: string;
}

/**
 * MigrationEngine permite a los plugins extender la base de datos de forma segura
 * a través de una API controlada (evitando SQL directo inyectado por el plugin).
 */
export class MigrationEngine {
  /**
   * Añade un campo personalizado a una tabla en todos los esquemas de tenants.
   */
  public static async addCustomField(request: CustomFieldRequest): Promise<void> {
    const db = ClientFactory.getClient('public');

    // Forzar prefijo para evitar colisiones con el core del ERP
    const prefixedFieldName = request.fieldName.startsWith('p_') 
      ? request.fieldName 
      : `p_${request.fieldName}`;
    
    console.log(`[MigrationEngine] Plugin ${request.pluginId} solicita campo ${prefixedFieldName} en ${request.tableName}...`);

    // 1. Comprobar si ya existe el registro para evitar duplicados en el UI
    const [existing] = await db.select()
      .from(schema.pluginFields)
      .where(
        and(
          eq(schema.pluginFields.pluginId, request.pluginId),
          eq(schema.pluginFields.tableName, request.tableName),
          eq(schema.pluginFields.fieldName, prefixedFieldName)
        )
      );

    if (!existing) {
      // Registrar en metadatos globales (public)
      await db.insert(schema.pluginFields).values({
        id: crypto.randomUUID(),
        pluginId: request.pluginId,
        tableName: request.tableName,
        fieldName: prefixedFieldName,
        fieldType: request.fieldType,
        label: request.label
      });
    }

    // 2. Obtener todos los tenants para aplicar el cambio
    const tenantsList = await db.select().from(schema.tenants);

    for (const tenant of tenantsList) {
      await this.applyFieldToSchema(tenant.schemaName, {
        ...request,
        fieldName: prefixedFieldName
      });
    }
  }

  /**
   * Ejecuta el ALTER TABLE en un esquema específico.
   */
  private static async applyFieldToSchema(schemaName: string, field: CustomFieldRequest) {
    const db = ClientFactory.getClient(schemaName);
    
    // Mapear tipos de TS a SQL
    const sqlTypes = {
      TEXT: 'TEXT',
      INTEGER: 'INTEGER',
      DECIMAL: 'DECIMAL(10,2)',
      BOOLEAN: 'BOOLEAN',
      JSONB: 'JSONB'
    };

    const sqlType = sqlTypes[field.fieldType];

    try {
      // Usar execute con sql.raw para el DDL
      await db.execute(
        sql.raw(`ALTER TABLE "${schemaName}"."${field.tableName}" ADD COLUMN IF NOT EXISTS "${field.fieldName}" ${sqlType}`)
      );
      console.log(`[MigrationEngine] Campo ${field.fieldName} añadido a ${schemaName}.${field.tableName}`);
    } catch (err) {
      console.error(`[MigrationEngine] Error aplicando campo a ${schemaName}:`, err);
    }
  }

  /**
   * Verifica si una columna tiene datos antes de permitir su borrado.
   */
  public static async canSafeDeleteField(schemaName: string, tableName: string, fieldName: string): Promise<boolean> {
    const db = ClientFactory.getClient(schemaName);
    
    const result: any = await db.execute(
      sql.raw(`SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}" WHERE "${fieldName}" IS NOT NULL`)
    );
    
    const count = parseInt(result.rows[0]?.count || '0');
    return count === 0;
  }
}
