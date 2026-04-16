import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import crypto from 'crypto';
import { getPublicDb, getAllTenants, getTenantDb, disconnect, schema as getSchema, sql, eq } from '../utils/db';
import { log } from '../utils/logger';

export function registerTenantCommand(program: Command) {
  const tenant = program
    .command('tenant')
    .description('Gestión de tenants (empresas)');

  // ── openfactu tenant list ──
  tenant
    .command('list')
    .description('Lista todos los tenants')
    .action(async () => {
      const spinner = ora('Cargando tenants...').start();
      try {
        const tenants = await getAllTenants();

        if (tenants.length === 0) {
          spinner.warn('No hay tenants registrados');
          return;
        }

        spinner.succeed(`${tenants.length} tenant(s) encontrado(s)`);

        const table = new Table({
          head: [chalk.white('Nombre'), chalk.white('Schema'), chalk.white('ID'), chalk.white('Creado')],
          style: { head: [], border: ['dim'] },
        });

        for (const t of tenants) {
          table.push([
            chalk.bold(t.name),
            chalk.cyan(t.schemaName),
            chalk.dim(t.id.substring(0, 8) + '...'),
            t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-ES') : '-',
          ]);
        }

        console.log(table.toString());
      } catch (err: any) {
        spinner.fail(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });

  // ── openfactu tenant create ──
  tenant
    .command('create [name]')
    .description('Crea un nuevo tenant')
    .action(async (name?: string) => {
      try {
        let tenantName = name;

        if (!tenantName) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Nombre de la empresa:',
              validate: (v: string) => v.trim().length > 0 || 'El nombre es obligatorio',
            },
          ]);
          tenantName = answers.name;
        }

        const schemaName = 'tenant_' + tenantName!
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');

        log.info(`Empresa: ${chalk.bold(tenantName)}`);
        log.info(`Schema:  ${chalk.cyan(schemaName)}`);
        log.blank();

        const spinner = ora('Creando tenant...').start();
        const publicDb = getPublicDb();

        // Verificar que no exista
        const [existing] = await publicDb
          .select()
          .from(getSchema().tenants)
          .where(eq(getSchema().tenants.name, tenantName!));

        if (existing) {
          spinner.warn(`El tenant "${tenantName}" ya existe (${existing.id})`);
          return;
        }

        // Crear registro en la tabla Tenant
        const tenantId = crypto.randomUUID();
        await publicDb.insert(getSchema().tenants).values({
          id: tenantId,
          name: tenantName!,
          schemaName,
          config: JSON.stringify({ createdAt: new Date(), createdBy: 'CLI' }),
          updatedAt: new Date(),
        });

        spinner.text = 'Creando schema de PostgreSQL...';
        await publicDb.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));

        spinner.text = 'Ejecutando migraciones...';

        // Aplicar migraciones
        const fs = require('fs');
        const path = require('path');
        const MIGRATIONS_DIR = require('../utils/paths').getMigrationsDir();

        if (fs.existsSync(MIGRATIONS_DIR)) {
          const tenantDb = getTenantDb(schemaName);

          // Crear tabla de historia
          await tenantDb.execute(
            sql.raw(`
              CREATE TABLE IF NOT EXISTS "${schemaName}"."_MigrationHistory" (
                "id" TEXT PRIMARY KEY,
                "description" TEXT,
                "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `),
          );

          const files = fs.readdirSync(MIGRATIONS_DIR).filter((f: string) => f.endsWith('.sql')).sort();

          for (const file of files) {
            spinner.text = `Aplicando ${file}...`;
            const migrationId = file.replace('.sql', '');
            const filePath = path.join(MIGRATIONS_DIR, file);
            let rawSql = fs.readFileSync(filePath, 'utf8');
            const processedSql = rawSql.replace(/{{schema}}/g, schemaName);

            const statements = processedSql
              .split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

            for (const statement of statements) {
              await tenantDb.execute(sql.raw(statement));
            }

            await tenantDb.execute(
              sql.raw(
                `INSERT INTO "${schemaName}"."_MigrationHistory" (id, description) VALUES ('${migrationId}', 'Creado desde CLI')`,
              ),
            );
          }
        }

        spinner.succeed('Tenant creado correctamente');
        log.blank();
        log.success(`ID:      ${chalk.dim(tenantId)}`);
        log.success(`Nombre:  ${chalk.bold(tenantName)}`);
        log.success(`Schema:  ${chalk.cyan(schemaName)}`);
      } catch (err: any) {
        log.error(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });

  // ── openfactu tenant sync ──
  tenant
    .command('sync [name]')
    .description('Sincroniza migraciones de un tenant o todos')
    .action(async (name?: string) => {
      const spinner = ora('Sincronizando...').start();

      try {
        let tenants: any[];
        if (name) {
          const t = await getAllTenants();
          const found = t.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
          if (!found) {
            spinner.fail(`Tenant "${name}" no encontrado`);
            return;
          }
          tenants = [found];
        } else {
          tenants = await getAllTenants();
        }

        spinner.succeed(`Sincronizando ${tenants.length} tenant(s)...`);

        // Usamos el mismo proceso de migración
        const fs = require('fs');
        const path = require('path');
        const MIGRATIONS_DIR = require('../utils/paths').getMigrationsDir();
        const files = fs.existsSync(MIGRATIONS_DIR)
          ? fs.readdirSync(MIGRATIONS_DIR).filter((f: string) => f.endsWith('.sql')).sort()
          : [];

        for (const tenant of tenants) {
          const tenantDb = getTenantDb(tenant.schemaName);

          // Asegurar tabla de historia
          await tenantDb.execute(
            sql.raw(`
              CREATE TABLE IF NOT EXISTS "${tenant.schemaName}"."_MigrationHistory" (
                "id" TEXT PRIMARY KEY,
                "description" TEXT,
                "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `),
          );

          const result: any = await tenantDb.execute(
            sql.raw(`SELECT id FROM "${tenant.schemaName}"."_MigrationHistory" ORDER BY id`),
          );
          const applied = result.rows.map((r: any) => r.id);
          const pending = files.filter((f: string) => !applied.includes(f.replace('.sql', '')));

          if (pending.length === 0) {
            log.dim(`  ${tenant.name} — al día`);
          } else {
            log.info(`  ${tenant.name} — ${pending.length} pendiente(s)`);
            for (const file of pending) {
              const migrationId = file.replace('.sql', '');
              const filePath = path.join(MIGRATIONS_DIR, file);
              let rawSql = fs.readFileSync(filePath, 'utf8');
              const processedSql = rawSql.replace(/{{schema}}/g, tenant.schemaName);

              const statements = processedSql
                .split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);

              for (const statement of statements) {
                await tenantDb.execute(sql.raw(statement));
              }

              await tenantDb.execute(
                sql.raw(
                  `INSERT INTO "${tenant.schemaName}"."_MigrationHistory" (id, description) VALUES ('${migrationId}', 'Sync CLI')`,
                ),
              );
              log.success(`    ${file}`);
            }
          }
        }

        log.blank();
        log.success('Sincronización completada');
      } catch (err: any) {
        spinner.fail(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });
}
