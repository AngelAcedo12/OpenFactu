import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

interface CustomFieldRequest {
  pluginId: string;
  tableName: string;
  fieldName: string;
  type: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB'; // Cambiado fieldType a type por consistencia
  label: string;
}

interface PluginColumn {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSONB' | 'UUID' | 'TIMESTAMP';
  primaryKey?: boolean;
  nullable?: boolean;
  default?: string;
}

interface CreateTableRequest {
  pluginId: string;
  tableName: string;
  columns: PluginColumn[];
}

/**
 * MigrationEngine permite a los plugins extender la base de datos de forma segura
 * a través de una API controlada (evitando SQL directo inyectado por el plugin).
 */
export class MigrationEngine {
  /**
   * Asegura que las tablas de metadatos existan en el esquema público.
   */
  private static async ensureMetadataTables() {
    const db = ClientFactory.getClient('public');

    // 1. Asegurar PluginField
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "PluginField" (
        "id" TEXT PRIMARY KEY,
        "pluginId" TEXT NOT NULL,
        "tableName" TEXT NOT NULL,
        "fieldName" TEXT NOT NULL,
        "fieldType" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "isManaged" BOOLEAN DEFAULT true NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    );

    // 2. Asegurar PluginTable
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "PluginTable" (
        "id" TEXT PRIMARY KEY,
        "pluginId" TEXT NOT NULL,
        "tableName" TEXT NOT NULL,
        "definition" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    );

    // 3. Asegurar TenantPlugin
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "TenantPlugin" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
        "pluginId" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT false NOT NULL,
        "config" TEXT,
        "activatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deactivatedAt" TIMESTAMP,
        UNIQUE("tenantId", "pluginId")
      )
    `),
    );
  }

  /**
   * Añade un campo personalizado a una tabla en todos los esquemas de tenants.
   */
  public static async addCustomField(request: CustomFieldRequest): Promise<void> {
    await this.ensureMetadataTables();
    const db = ClientFactory.getClient('public');

    const prefixedFieldName = request.fieldName.startsWith('p_')
      ? request.fieldName
      : `p_${request.fieldName}`;

    console.log(
      `[MigrationEngine] Plugin ${request.pluginId} solicita campo ${prefixedFieldName} en ${request.tableName}...`,
    );

    const [existing] = await db
      .select()
      .from(schema.pluginFields)
      .where(
        and(
          eq(schema.pluginFields.pluginId, request.pluginId),
          eq(schema.pluginFields.tableName, request.tableName),
          eq(schema.pluginFields.fieldName, prefixedFieldName),
        ),
      );

    if (!existing) {
      await db.insert(schema.pluginFields).values({
        id: crypto.randomUUID(),
        pluginId: request.pluginId,
        tableName: request.tableName,
        fieldName: prefixedFieldName,
        fieldType: request.type, // Cambiado de fieldType a type
        label: request.label,
      });
    }

    const tenantsList = await db.select().from(schema.tenants);

    for (const tenant of tenantsList) {
      await this.applyFieldToSchema(tenant.schemaName, {
        ...request,
        fieldName: prefixedFieldName,
      });
    }
  }

  /**
   * Crea una nueva tabla para un plugin en todos los tenants.
   */
  public static async createPluginTable(request: CreateTableRequest): Promise<void> {
    await this.ensureMetadataTables();
    const db = ClientFactory.getClient('public');

    const prefixedTableName = request.tableName.startsWith('pt_')
      ? request.tableName
      : `pt_${request.tableName}`;

    console.log(
      `[MigrationEngine] Plugin ${request.pluginId} creando tabla ${prefixedTableName}...`,
    );

    // 1. Registrar en metadatos
    const [existing] = await db
      .select()
      .from(schema.pluginTables)
      .where(
        and(
          eq(schema.pluginTables.pluginId, request.pluginId),
          eq(schema.pluginTables.tableName, prefixedTableName),
        ),
      );

    if (!existing) {
      await db.insert(schema.pluginTables).values({
        id: crypto.randomUUID(),
        pluginId: request.pluginId,
        tableName: prefixedTableName,
        definition: JSON.stringify(request.columns),
      });
    }

    // 2. Aplicar a todos los tenants
    const tenantsList = await db.select().from(schema.tenants);
    for (const tenant of tenantsList) {
      await this.applyTableToSchema(tenant.schemaName, prefixedTableName, request.columns);
    }
  }

  private static async applyTableToSchema(
    schemaName: string,
    tableName: string,
    columns: PluginColumn[],
  ) {
    const db = ClientFactory.getClient(schemaName);

    const sqlTypes: Record<string, string> = {
      TEXT: 'TEXT',
      INTEGER: 'INTEGER',
      DECIMAL: 'DECIMAL(15,4)',
      BOOLEAN: 'BOOLEAN',
      JSONB: 'JSONB',
      UUID: 'UUID',
      TIMESTAMP: 'TIMESTAMP',
    };

    const colDefs = columns.map((c) => {
      let def = `"${c.name}" ${sqlTypes[c.type]}`;
      if (c.primaryKey) def += ' PRIMARY KEY';
      if (!c.nullable && !c.primaryKey) def += ' NOT NULL';
      if (c.default) def += ` DEFAULT ${c.default}`;
      return def;
    });

    try {
      await db.execute(
        sql.raw(
          `CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (${colDefs.join(', ')})`,
        ),
      );
      console.log(`[MigrationEngine] Tabla ${tableName} creada/verificada en ${schemaName}`);
    } catch (err) {
      console.error(`[MigrationEngine] Error creando tabla en ${schemaName}:`, err);
    }
  }

  /**
   * Ejecuta el ALTER TABLE en un esquema específico.
   */
  private static async applyFieldToSchema(schemaName: string, field: CustomFieldRequest) {
    const db = ClientFactory.getClient(schemaName);

    const sqlTypes: Record<string, string> = {
      TEXT: 'TEXT',
      INTEGER: 'INTEGER',
      DECIMAL: 'DECIMAL(10,2)',
      BOOLEAN: 'BOOLEAN',
      JSONB: 'JSONB',
    };

    const sqlType = sqlTypes[field.type];

    try {
      // Usar execute con sql.raw para el DDL
      await db.execute(
        sql.raw(
          `ALTER TABLE "${schemaName}"."${field.tableName}" ADD COLUMN IF NOT EXISTS "${field.fieldName}" ${sqlType}`,
        ),
      );
      console.log(
        `[MigrationEngine] Campo ${field.fieldName} añadido a ${schemaName}.${field.tableName}`,
      );
    } catch (err) {
      console.error(`[MigrationEngine] Error aplicando campo a ${schemaName}:`, err);
    }
  }

  /**
   * Verifica si una columna tiene datos antes de permitir su borrado.
   */
  public static async canSafeDeleteField(
    schemaName: string,
    tableName: string,
    fieldName: string,
  ): Promise<boolean> {
    const db = ClientFactory.getClient(schemaName);

    const result: any = await db.execute(
      sql.raw(
        `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}" WHERE "${fieldName}" IS NOT NULL`,
      ),
    );

    const count = parseInt(result.rows[0]?.count || '0');
    return count === 0;
  }
}
