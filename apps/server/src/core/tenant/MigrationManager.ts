import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ClientFactory } from './ClientFactory';
import { sql, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { getDefaultTemplate, DEFAULT_TEMPLATE_NAMES, ALL_DOC_TYPES } from '@openfactu/pdf';
import { seedDefaults } from './seedDefaults';

/**
 * MigrationManager lee archivos .sql de la carpeta /migrations
 * y los aplica a cada esquema de empresa usando Drizzle.
 */
export class MigrationManager {
  private static MIGRATIONS_DIR = path.join(__dirname, 'migrations');

  /**
   * Sincroniza una empresa específica.
   */
  public static async syncTenant(schemaName: string) {
    const db = ClientFactory.getClient(schemaName);
    console.log(`[MigrationManager] Verificando esquema: ${schemaName}`);

    // 1. Asegurar tabla de historia (SQL Directo)
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."_MigrationHistory" (
        "id" TEXT PRIMARY KEY,
        "description" TEXT,
        "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    );

    // 2. Leer archivos SQL
    if (!fs.existsSync(this.MIGRATIONS_DIR)) {
      // Esto suele pasar en producción: el `tsc build` no copia los .sql a
      // `dist/core/tenant/migrations`. Si pasa, ninguna migración se aplica
      // y el tenant queda sin tablas (SystemConfig, AccountingPeriod, ...).
      // Asegúrate de que `package.json` tenga un step `copy-assets` que
      // copie los .sql a `dist/`, o ejecuta `npm run sync` desde `src/`.
      console.error(
        `[MigrationManager] ⚠️  Carpeta de migraciones AUSENTE: ${this.MIGRATIONS_DIR}\n` +
          `   Las migraciones NO se aplicarán. El tenant ${schemaName} quedará sin tablas.\n` +
          `   Solución: en producción asegúrate de que los archivos .sql se copian a\n` +
          `   dist/core/tenant/migrations/. En dev usa \`npm run dev\` (corre desde src).`,
      );
      return;
    }

    const files = fs
      .readdirSync(this.MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationId = file.replace('.sql', '');

      // Verificar si ya se aplicó
      const result: any = await db.execute(
        sql.raw(`SELECT id FROM "${schemaName}"."_MigrationHistory" WHERE id = '${migrationId}'`),
      );

      if (result.rows.length === 0) {
        console.log(`[MigrationManager] Aplicando migración: ${file}`);

        try {
          const filePath = path.join(this.MIGRATIONS_DIR, file);
          let rawSql = fs.readFileSync(filePath, 'utf8');
          const processedSql = rawSql.replace(/{{schema}}/g, schemaName);

          // Dividir por punto y coma, ignorando aquellos dentro de bloques $$ (PL/pgSQL)
          const statements = processedSql
            .split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (const statement of statements) {
            await db.execute(sql.raw(statement));
          }

          // Registrar éxito
          await db.execute(
            sql.raw(
              `INSERT INTO "${schemaName}"."_MigrationHistory" (id, description) VALUES ('${migrationId}', 'Aplicado desde ${file}')`,
            ),
          );

          console.log(`   ✅ Sincronizado correctamente.`);
        } catch (error: any) {
          console.error(`   ❌ Error en ${file}:`, error); // Log full error object
          throw error;
        }
      }
    }

    // 3. Seed de datos maestros por defecto (impuestos, UoMs, series, etc.)
    try {
      await seedDefaults(schemaName);
    } catch (err: any) {
      console.warn(
        `[MigrationManager] No se pudieron sembrar defaults en ${schemaName}: ${err.message}`,
      );
    }

    // 4. Seed de plantillas de documento por defecto (si no existen)
    await this.seedDefaultTemplates(schemaName);
  }

  /**
   * Inserta una plantilla por defecto para cada tipo de documento que aún no tenga ninguna.
   */
  private static async seedDefaultTemplates(schemaName: string) {
    const db = ClientFactory.getClient(schemaName);
    try {
      for (const docType of ALL_DOC_TYPES) {
        const existing = await db
          .select({ id: schema.documentTemplates.id })
          .from(schema.documentTemplates)
          .where(eq(schema.documentTemplates.docType, docType));
        if (existing.length > 0) continue;

        await db.insert(schema.documentTemplates).values({
          id: crypto.randomUUID(),
          docType,
          name: DEFAULT_TEMPLATE_NAMES[docType],
          html: getDefaultTemplate(docType),
          isDefault: true,
        });
        console.log(`[Templates] Seeded default template for ${docType} in ${schemaName}`);
      }
    } catch (err: any) {
      console.warn(`[Templates] No se pudo sembrar plantillas en ${schemaName}: ${err.message}`);
    }
  }

  /**
   * Sincroniza todos los tenants.
   */
  public static async syncAllTenants() {
    console.log('[MigrationManager] Iniciando sincronización global...');
    const db = ClientFactory.getClient('public');

    try {
      // Usamos Drizzle tipado para obtener la lista de tenants
      const tenantsList = await db
        .select({
          schemaName: schema.tenants.schemaName,
        })
        .from(schema.tenants);

      for (const t of tenantsList) {
        await this.syncTenant(t.schemaName);
      }
      console.log('[MigrationManager] Sincronización finalizada.');
    } catch (error: any) {
      // Si la tabla no existe aún, informamos discretamente
      if (error.message.includes('relation "Tenant" does not exist')) {
        console.warn(
          '[MigrationManager] Tabla Tenant no encontrada. Postergando sincronización global.',
        );
      } else {
        console.error('[MigrationManager] Error en sincronización global:', error.message);
      }
    }
  }
}
