import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { getPublicDb, getAllTenants, disconnect, schema as getSchema, eq } from '../utils/db';
import { log } from '../utils/logger';
import { getPluginsDir } from '../utils/paths';

// Registrar el plugin de autocomplete
const AutocompletePrompt = require('inquirer-autocomplete-prompt');
inquirer.registerPrompt('autocomplete', AutocompletePrompt);

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'openfactu-cli' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Respuesta no valida')); }
      });
    }).on('error', reject);
  });
}

export function registerPluginCommand(program: Command) {
  const plugin = program
    .command('plugin')
    .description('Gestion de plugins');

  // ── openfactu plugin list ──
  plugin
    .command('list')
    .description('Lista plugins instalados')
    .action(async () => {
      const spinner = ora('Leyendo plugins...').start();

      try {
        const installed: string[] = [];
        if (fs.existsSync(getPluginsDir())) {
          const dirs = fs.readdirSync(getPluginsDir()).filter((d) =>
            fs.statSync(path.join(getPluginsDir(), d)).isDirectory(),
          );
          installed.push(...dirs);
        }

        if (installed.length === 0) {
          spinner.warn('No hay plugins instalados');
          return;
        }

        const publicDb = getPublicDb();
        let tenantPlugins: any[] = [];
        try {
          tenantPlugins = await publicDb.select().from(getSchema().tenantPlugins);
        } catch {}

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
          const manifestPath = path.join(getPluginsDir(), pluginId, 'manifest.json');
          const hasManifest = fs.existsSync(manifestPath);
          let manifest: any = null;
          if (hasManifest) {
            try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
          }

          const row: string[] = [
            chalk.bold(manifest?.name || pluginId),
            hasManifest ? chalk.green('Si') : chalk.dim('No'),
          ];

          for (const tenant of tenants) {
            const tp = tenantPlugins.find(
              (r: any) => r.tenantId === tenant.id && r.pluginId === pluginId,
            );
            if (tp?.isActive) row.push(chalk.green('Activo'));
            else if (tp) row.push(chalk.dim('Inactivo'));
            else row.push(chalk.dim('-'));
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

  // ── openfactu plugin search ──
  plugin
    .command('search [query]')
    .description('Busca plugins en el marketplace (interactivo)')
    .action(async (query?: string) => {
      const spinner = ora('Cargando marketplace...').start();

      let repos: any[] = [];
      try {
        const data = await fetchJSON(
          'https://api.github.com/search/repositories?q=topic:openfactu-plugin&sort=stars&order=desc&per_page=50',
        );
        repos = data.items || [];
      } catch (err: any) {
        spinner.fail('No se pudo conectar al marketplace: ' + err.message);
        return;
      }

      if (repos.length === 0) {
        spinner.warn('No hay plugins en el marketplace');
        return;
      }

      const installedDirs = fs.existsSync(getPluginsDir())
        ? fs.readdirSync(getPluginsDir()).filter((d) => fs.statSync(path.join(getPluginsDir(), d)).isDirectory())
        : [];

      spinner.succeed(`${repos.length} plugin(s) en el marketplace`);
      log.blank();

      const { selected } = await inquirer.prompt([
        {
          type: 'autocomplete' as any,
          name: 'selected',
          message: 'Buscar plugin:',
          source: (_answers: any, input: string) => {
            const q = (input || '').toLowerCase();
            return repos
              .filter((r: any) =>
                !q || r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q),
              )
              .map((r: any) => {
                const installed = installedDirs.includes(r.name);
                const status = installed ? chalk.green(' [instalado]') : '';
                const stars = chalk.yellow(`★${r.stargazers_count}`);
                return {
                  name: `${chalk.bold(r.name)} ${chalk.dim('por ' + r.owner.login)} ${stars}${status}\n   ${chalk.dim(r.description || 'Sin descripcion')}`,
                  value: r,
                  short: r.name,
                };
              });
          },
          pageSize: 10,
        },
      ]);

      const r = selected;
      const isInstalled = installedDirs.includes(r.name);
      const topics = (r.topics || []).filter((t: string) => t !== 'openfactu-plugin');

      log.blank();
      console.log(chalk.bold.white(`  ${r.name}`));
      console.log(chalk.dim(`  por ${r.owner.login} · ★ ${r.stargazers_count} · ${r.language || 'TypeScript'}`));
      if (r.description) console.log(`  ${r.description}`);
      if (topics.length > 0) console.log(chalk.dim(`  Tags: ${topics.join(', ')}`));
      console.log(chalk.dim(`  ${r.html_url}`));
      log.blank();

      if (isInstalled) {
        log.success('Este plugin ya esta instalado');
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Que quieres hacer?',
            choices: [
              { name: 'Actualizar', value: 'update' },
              { name: 'Eliminar', value: 'remove' },
              { name: 'Nada', value: 'none' },
            ],
          },
        ]);

        if (action === 'update') {
          const upSpinner = ora('Actualizando...').start();
          try {
            execSync('git pull --ff-only', { cwd: path.join(getPluginsDir(), r.name), stdio: 'pipe' });
            upSpinner.succeed('Plugin actualizado');
          } catch {
            upSpinner.warn('No se pudo actualizar');
          }
        } else if (action === 'remove') {
          fs.rmSync(path.join(getPluginsDir(), r.name), { recursive: true, force: true });
          log.success('Plugin eliminado');
        }
      } else {
        const { install } = await inquirer.prompt([
          { type: 'confirm', name: 'install', message: 'Instalar este plugin?', default: true },
        ]);

        if (install) {
          const pluginsDir = getPluginsDir();
          if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

          const cloneSpinner = ora('Descargando...').start();
          try {
            execSync(`git clone ${r.clone_url} "${path.join(pluginsDir, r.name)}"`, { stdio: 'pipe', timeout: 60000 });
            cloneSpinner.succeed(`Plugin "${r.name}" instalado`);
            log.dim('  Reinicia el servidor para cargarlo.');
          } catch (err: any) {
            cloneSpinner.fail('Error: ' + err.message);
          }
        }
      }
    });

  // ── openfactu plugin install ──
  plugin
    .command('install <name>')
    .description('Instala un plugin desde el marketplace')
    .option('--repo <url>', 'URL del repositorio (si no es del marketplace)')
    .action(async (name: string, opts: any) => {
      const pluginsDir = getPluginsDir();
      const targetDir = path.join(pluginsDir, name);

      // Verificar si ya esta instalado
      if (fs.existsSync(targetDir)) {
        log.warn(`El plugin "${name}" ya esta instalado en ${targetDir}`);
        log.dim('  Para actualizar: openfactu plugin update ' + name);
        return;
      }

      let repoUrl = opts.repo;

      if (!repoUrl) {
        // Buscar en el marketplace
        const spinner = ora(`Buscando "${name}" en el marketplace...`).start();
        try {
          const data = await fetchJSON(
            'https://api.github.com/search/repositories?q=topic:openfactu-plugin+' + encodeURIComponent(name) + '&sort=stars&order=desc',
          );

          const match = (data.items || []).find((r: any) =>
            r.name.toLowerCase() === name.toLowerCase(),
          );

          if (!match) {
            // Buscar sin filtro exacto
            const fuzzy = (data.items || []).find((r: any) =>
              r.name.toLowerCase().includes(name.toLowerCase()),
            );
            if (fuzzy) {
              repoUrl = fuzzy.clone_url;
              spinner.succeed(`Encontrado: ${fuzzy.full_name}`);
            } else {
              spinner.fail(`Plugin "${name}" no encontrado en el marketplace`);
              log.dim('  Usa --repo <url> para instalar desde un repositorio especifico');
              return;
            }
          } else {
            repoUrl = match.clone_url;
            spinner.succeed(`Encontrado: ${match.full_name}`);
          }
        } catch (err: any) {
          spinner.fail('Error buscando: ' + err.message);
          return;
        }
      }

      // Crear directorio de plugins si no existe
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
      }

      // Clonar
      const cloneSpinner = ora('Descargando plugin...').start();
      try {
        execSync(`git clone ${repoUrl} "${targetDir}"`, { stdio: 'pipe', timeout: 60000 });
        cloneSpinner.succeed('Plugin descargado');
      } catch (err: any) {
        cloneSpinner.fail('Error al descargar: ' + err.message);
        return;
      }

      // Verificar estructura
      const hasIndex = fs.existsSync(path.join(targetDir, 'index.ts')) || fs.existsSync(path.join(targetDir, 'index.js'));
      const hasManifest = fs.existsSync(path.join(targetDir, 'manifest.json'));

      log.blank();
      log.success(`Plugin "${name}" instalado en ${targetDir}`);
      log.info(`Punto de entrada: ${hasIndex ? chalk.green('Si') : chalk.yellow('No encontrado')}`);
      log.info(`Manifest:         ${hasManifest ? chalk.green('Si') : chalk.dim('No')}`);
      log.blank();
      log.dim('  Reinicia el servidor para cargar el plugin.');
      log.dim('  Activa el plugin por empresa desde la UI o API.');
    });

  // ── openfactu plugin update ──
  plugin
    .command('update [name]')
    .description('Actualiza un plugin o todos')
    .action(async (name?: string) => {
      const pluginsDir = getPluginsDir();

      if (!fs.existsSync(pluginsDir)) {
        log.warn('No hay plugins instalados');
        return;
      }

      const dirs = name
        ? [name]
        : fs.readdirSync(pluginsDir).filter((d) => fs.statSync(path.join(pluginsDir, d)).isDirectory());

      let updated = 0;

      for (const dir of dirs) {
        const pluginPath = path.join(pluginsDir, dir);
        const gitDir = path.join(pluginPath, '.git');

        if (!fs.existsSync(gitDir)) {
          log.dim(`  ${dir} — no es un repositorio git, omitiendo`);
          continue;
        }

        const spinner = ora(`Actualizando ${dir}...`).start();
        try {
          execSync('git pull --ff-only', { cwd: pluginPath, stdio: 'pipe', timeout: 30000 });
          const status = execSync('git log --oneline -1', { cwd: pluginPath }).toString().trim();
          spinner.succeed(`${dir} — ${status}`);
          updated++;
        } catch (err: any) {
          spinner.warn(`${dir} — no se pudo actualizar`);
        }
      }

      log.blank();
      if (updated > 0) {
        log.success(`${updated} plugin(s) actualizado(s)`);
        log.dim('  Reinicia el servidor para aplicar los cambios.');
      } else {
        log.info('No hay actualizaciones');
      }
    });

  // ── openfactu plugin remove ──
  plugin
    .command('remove <name>')
    .description('Elimina un plugin instalado')
    .action(async (name: string) => {
      const targetDir = path.join(getPluginsDir(), name);

      if (!fs.existsSync(targetDir)) {
        log.error(`Plugin "${name}" no encontrado`);
        return;
      }

      const spinner = ora(`Eliminando ${name}...`).start();
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
        spinner.succeed(`Plugin "${name}" eliminado`);
        log.dim('  Reinicia el servidor para aplicar los cambios.');
        log.dim('  Los datos del plugin (campos, tablas) se mantienen en la BD.');
      } catch (err: any) {
        spinner.fail('Error: ' + err.message);
      }
    });
}
