import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import path from 'path';
import fs from 'fs';
import { getPublicDb, getTenantDb, getAllTenants, getTenantByName, disconnect, sql } from '../utils/db';
import { log } from '../utils/logger';

import { getMigrationsDir } from '../utils/paths';

function getMigrDir() { return getMigrationsDir(); }

function getMigrationFiles(): string[] {
  if (!fs.existsSync(getMigrDir())) return [];
  return fs.readdirSync(getMigrDir()).filter((f) => f.endsWith('.sql')).sort();
}

async function getAppliedMigrations(tenantDb: any, schemaName: string): Promise<string[]> {
  try {
    const result: any = await tenantDb.execute(
      sql.raw(`SELECT id FROM "${schemaName}"."_MigrationHistory" ORDER BY id`),
    );
    return result.rows.map((r: any) => r.id);
  } catch {
    return [];
  }
}

async function applyMigration(tenantDb: any, schemaName: string, file: string): Promise<void> {
  const migrationId = file.replace('.sql', '');
  const filePath = path.join(getMigrDir(), file);
  let rawSql = fs.readFileSync(filePath, 'utf8');
  const processedSql = rawSql.replace(/{{schema}}/g, schemaName);

  const statements = processedSql
    .split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await tenantDb.execute(sql.raw(statement));
  }

  await tenantDb.execute(
    sql.raw(
      `INSERT INTO "${schemaName}"."_MigrationHistory" (id, description) VALUES ('${migrationId}', 'Aplicado desde CLI')`,
    ),
  );
}

export function registerMigrateCommand(program: Command) {
  // ── openfactu migrate ──
  program
    .command('migrate')
    .description('Ejecuta migraciones pendientes en todos los tenants')
    .option('-t, --tenant <name>', 'Migrar solo un tenant específico')
    .action(async (opts) => {
      const spinner = ora('Conectando a la base de datos...').start();

      try {
        const allFiles = getMigrationFiles();
        if (allFiles.length === 0) {
          spinner.fail('No se encontraron archivos de migración');
          return;
        }

        let tenants: any[];
        if (opts.tenant) {
          const tenant = await getTenantByName(opts.tenant);
          if (!tenant) {
            spinner.fail(`Tenant "${opts.tenant}" no encontrado`);
            return;
          }
          tenants = [tenant];
        } else {
          tenants = await getAllTenants();
        }

        if (tenants.length === 0) {
          spinner.warn('No hay tenants registrados');
          return;
        }

        spinner.succeed(`${tenants.length} tenant(s) encontrado(s), ${allFiles.length} migraciones disponibles`);
        log.blank();

        let totalApplied = 0;

        for (const tenant of tenants) {
          const tenantDb = getTenantDb(tenant.schemaName);
          const applied = await getAppliedMigrations(tenantDb, tenant.schemaName);
          const pending = allFiles.filter((f) => !applied.includes(f.replace('.sql', '')));

          if (pending.length === 0) {
            log.dim(`  ${tenant.name} (${tenant.schemaName}) — al dia`);
            continue;
          }

          log.title(`  ${tenant.name} (${tenant.schemaName})`);

          for (const file of pending) {
            const migSpinner = ora(`  Aplicando ${file}...`).start();
            try {
              await applyMigration(tenantDb, tenant.schemaName, file);
              migSpinner.succeed(`  ${file}`);
              totalApplied++;
            } catch (err: any) {
              migSpinner.fail(`  ${file}: ${err.message}`);
              throw err;
            }
          }
        }

        log.blank();
        if (totalApplied > 0) {
          log.success(`${totalApplied} migración(es) aplicada(s)`);
        } else {
          log.success('Todos los tenants están al día');
        }
      } catch (err: any) {
        spinner.fail(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });

  // ── openfactu migrate:status ──
  program
    .command('migrate:status')
    .description('Muestra el estado de migraciones por tenant')
    .action(async () => {
      const spinner = ora('Leyendo estado de migraciones...').start();

      try {
        const allFiles = getMigrationFiles();
        const tenants = await getAllTenants();

        if (tenants.length === 0) {
          spinner.warn('No hay tenants registrados');
          return;
        }

        spinner.succeed(`${tenants.length} tenant(s), ${allFiles.length} migraciones`);
        log.blank();

        for (const tenant of tenants) {
          const tenantDb = getTenantDb(tenant.schemaName);
          const applied = await getAppliedMigrations(tenantDb, tenant.schemaName);
          const pending = allFiles.filter((f) => !applied.includes(f.replace('.sql', '')));

          const table = new Table({
            head: [chalk.white('Migración'), chalk.white('Estado')],
            colWidths: [45, 15],
            style: { head: [], border: ['dim'] },
          });

          for (const file of allFiles) {
            const migId = file.replace('.sql', '');
            const isApplied = applied.includes(migId);
            table.push([
              migId,
              isApplied ? chalk.green('✓ Aplicada') : chalk.yellow('Pendiente'),
            ]);
          }

          console.log(chalk.bold(`\n  ${tenant.name}`) + chalk.dim(` (${tenant.schemaName})`));
          console.log(
            chalk.dim(`  ${applied.length} aplicadas, `) +
            (pending.length > 0 ? chalk.yellow(`${pending.length} pendientes`) : chalk.green('al día'))
          );
          console.log(table.toString());
        }
      } catch (err: any) {
        spinner.fail(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });
}
