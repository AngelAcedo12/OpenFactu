import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';
import { getPublicDb, getAllTenants, disconnect, schema, eq } from '../utils/db';
import { log } from '../utils/logger';
import { getPluginsDir } from '../utils/paths';

const PLUGINS_DIR = getPluginsDir();

export function registerPluginCommand(program: Command) {
  const plugin = program
    .command('plugin')
    .description('Gestión de plugins');

  // ── openfactu plugin list ──
  plugin
    .command('list')
    .description('Lista plugins instalados')
    .action(async () => {
      const spinner = ora('Leyendo plugins...').start();

      try {
        // Leer plugins del filesystem
        const installed: string[] = [];
        if (fs.existsSync(PLUGINS_DIR)) {
          const dirs = fs.readdirSync(PLUGINS_DIR).filter((d) =>
            fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory(),
          );
          installed.push(...dirs);
        }

        if (installed.length === 0) {
          spinner.warn('No hay plugins instalados');
          return;
        }

        // Leer estado de activación por tenant
        const publicDb = getPublicDb();
        let tenantPlugins: any[] = [];
        try {
          tenantPlugins = await publicDb.select().from(schema.tenantPlugins);
        } catch {
          // Tabla puede no existir aún
        }

        const tenants = await getAllTenants();

        spinner.succeed(`${installed.length} plugin(s) instalado(s)`);
        log.blank();

        const table = new Table({
          head: [
            chalk.white('Plugin'),
            chalk.white('Manifest'),
            ...tenants.map((t: any) => chalk.white(t.name)),
          ],
          style: { head: [], border: ['dim'] },
        });

        for (const pluginId of installed) {
          const manifestPath = path.join(PLUGINS_DIR, pluginId, 'manifest.json');
          const hasManifest = fs.existsSync(manifestPath);

          let manifest: any = null;
          if (hasManifest) {
            try {
              manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            } catch {}
          }

          const row: string[] = [
            chalk.bold(manifest?.name || pluginId),
            hasManifest ? chalk.green('Si') : chalk.dim('No'),
          ];

          for (const tenant of tenants) {
            const tp = tenantPlugins.find(
              (r: any) => r.tenantId === tenant.id && r.pluginId === pluginId,
            );
            if (tp?.isActive) {
              row.push(chalk.green('Activo'));
            } else if (tp) {
              row.push(chalk.dim('Inactivo'));
            } else {
              row.push(chalk.dim('-'));
            }
          }

          table.push(row);
        }

        console.log(table.toString());
      } catch (err: any) {
        spinner.fail(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });
}
