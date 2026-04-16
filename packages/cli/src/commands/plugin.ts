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

  // ── openfactu plugin link ──
  plugin
    .command('link [dir]')
    .description('Enlaza un plugin externo a la carpeta de plugins de OpenFactu')
    .action(async (dir?: string) => {
      const pluginsDir = getPluginsDir();
      const sourcePath = path.resolve(dir || process.cwd());

      // Verificar que el directorio existe
      if (!fs.existsSync(sourcePath)) {
        log.error(`Directorio no encontrado: ${sourcePath}`);
        return;
      }

      // Verificar que tiene index.ts o index.js
      const hasIndex = fs.existsSync(path.join(sourcePath, 'index.ts')) || fs.existsSync(path.join(sourcePath, 'index.js'));
      if (!hasIndex) {
        log.warn('No se encontro index.ts ni index.js en el directorio');
        log.dim('  Asegurate de que es un plugin valido de OpenFactu');
      }

      const pluginName = path.basename(sourcePath);
      const linkPath = path.join(pluginsDir, pluginName);

      // Verificar si ya existe
      if (fs.existsSync(linkPath)) {
        const stat = fs.lstatSync(linkPath);
        if (stat.isSymbolicLink()) {
          log.warn(`El enlace "${pluginName}" ya existe → ${fs.readlinkSync(linkPath)}`);
          return;
        }
        log.error(`Ya existe un plugin "${pluginName}" (no es un symlink). Eliminalo primero.`);
        return;
      }

      // Crear directorio de plugins si no existe
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
      }

      // Crear symlink
      try {
        fs.symlinkSync(sourcePath, linkPath, 'dir');
        log.success(`Plugin enlazado: ${chalk.bold(pluginName)}`);
        log.dim(`  ${sourcePath} → ${linkPath}`);
        log.blank();
        log.dim('  Ahora puedes desarrollar el plugin desde su carpeta original.');
        log.dim('  Los cambios se detectan automaticamente con el watcher.');
        log.dim('  Para arrancar: openfactu plugin dev ' + pluginName);
      } catch (err: any) {
        log.error('Error al crear enlace: ' + err.message);
        log.dim('  En Windows ejecuta como administrador');
      }
    });

  // ── openfactu plugin unlink ──
  plugin
    .command('unlink <name>')
    .description('Elimina el enlace de un plugin externo')
    .action(async (name: string) => {
      const linkPath = path.join(getPluginsDir(), name);

      if (!fs.existsSync(linkPath)) {
        log.error(`Plugin "${name}" no encontrado`);
        return;
      }

      const stat = fs.lstatSync(linkPath);
      if (!stat.isSymbolicLink()) {
        log.error(`"${name}" no es un enlace simbolico. Usa 'plugin remove' para eliminarlo.`);
        return;
      }

      fs.unlinkSync(linkPath);
      log.success(`Enlace "${name}" eliminado`);
      log.dim('  El directorio original no se ha tocado.');
    });

  // ── openfactu plugin push ──
  plugin
    .command('push [dir]')
    .description('Sube un plugin a un servidor OpenFactu remoto')
    .requiredOption('-s, --server <url>', 'URL del servidor (ej: http://192.168.1.100:3000)')
    .option('-t, --token <token>', 'Token JWT de admin')
    .option('--client-id <id>', 'Client ID de la dev key (ej: ofk_...)')
    .option('--client-secret <secret>', 'Client Secret de la dev key (ej: ofs_...)')
    .action(async (dir: string | undefined, opts: any) => {
      // Validar autenticacion
      if (!opts.token && (!opts.clientId || !opts.clientSecret)) {
        log.error('Necesitas autenticarte con --token o --client-id + --client-secret');
        log.dim('  Genera una dev key desde la UI: Plugins → Desarrollo → Generar API Key');
        return;
      }

      const sourcePath = path.resolve(dir || process.cwd());

      if (!fs.existsSync(sourcePath)) {
        log.error(`Directorio no encontrado: ${sourcePath}`);
        return;
      }

      const pluginName = path.basename(sourcePath);
      const hasIndex = fs.existsSync(path.join(sourcePath, 'index.ts')) || fs.existsSync(path.join(sourcePath, 'index.js'));

      if (!hasIndex) {
        log.warn('No se encontro index.ts ni index.js. Seguro que es un plugin?');
      }

      log.info(`Plugin: ${chalk.bold(pluginName)}`);
      log.info(`Servidor: ${chalk.dim(opts.server)}`);
      log.blank();

      // Recoger todos los archivos del plugin
      const spinner = ora('Leyendo archivos...').start();
      const files: Array<{ path: string; content: string }> = [];

      function readDir(dirPath: string, basePath: string) {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
          const fullPath = path.join(dirPath, entry);
          const relativePath = path.relative(basePath, fullPath);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            readDir(fullPath, basePath);
          } else {
            files.push({
              path: relativePath,
              content: fs.readFileSync(fullPath).toString('base64'),
            });
          }
        }
      }

      readDir(sourcePath, sourcePath);
      spinner.succeed(`${files.length} archivo(s) encontrado(s)`);

      // Enviar al servidor
      const pushSpinner = ora('Subiendo al servidor...').start();
      try {
        const url = `${opts.server}/api/plugins/${pluginName}/push`;
        const response = await new Promise<any>((resolve, reject) => {
          const data = JSON.stringify({ files });
          const urlObj = new (require('url').URL)(url);
          const http = urlObj.protocol === 'https:' ? require('https') : require('http');

          const req = http.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
              ...(opts.token
                ? { 'Authorization': `Bearer ${opts.token}` }
                : { 'X-Client-Id': opts.clientId, 'X-Client-Secret': opts.clientSecret }
              ),
            },
          }, (res: any) => {
            let body = '';
            res.on('data', (chunk: string) => body += chunk);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
              catch { resolve({ status: res.statusCode, body }); }
            });
          });

          req.on('error', reject);
          req.write(data);
          req.end();
        });

        if (response.status === 200 && response.body?.success) {
          pushSpinner.succeed('Plugin subido correctamente');
          if (response.body.reloaded) {
            log.success('Plugin recargado automaticamente en el servidor');
          } else {
            log.info('Reinicia el servidor remoto para cargar el plugin');
          }
        } else if (response.status === 403 || response.status === 401) {
          pushSpinner.fail('No autorizado. Verifica el token de admin.');
        } else {
          pushSpinner.fail(`Error: ${response.body?.error || response.status}`);
        }
      } catch (err: any) {
        pushSpinner.fail('Error de conexion: ' + err.message);
      }
    });

  // ── openfactu plugin dev ──
  plugin
    .command('dev [name]')
    .description('Arranca el servidor en modo desarrollo para plugins')
    .action(async (name?: string) => {
      const pluginsDir = getPluginsDir();

      if (name) {
        const pluginPath = path.join(pluginsDir, name);
        if (!fs.existsSync(pluginPath)) {
          log.error(`Plugin "${name}" no encontrado en ${pluginsDir}`);
          return;
        }
        log.info(`Modo desarrollo para plugin: ${chalk.bold(name)}`);
      } else {
        log.info('Modo desarrollo para todos los plugins');
      }

      log.blank();
      log.dim('  El servidor recargara los plugins automaticamente al detectar cambios.');
      log.dim('  Los componentes UI se actualizan en el browser sin refrescar.');
      log.blank();

      const { getProjectRoot } = require('../utils/paths');
      const root = getProjectRoot();

      try {
        const child = require('child_process').spawn('npm', ['run', 'dev:server'], {
          cwd: root,
          env: { ...process.env, NODE_ENV: 'development' },
          stdio: ['inherit', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (!line) return;

          // Resaltar logs del plugin
          if (name && line.includes(name)) {
            console.log(chalk.cyan(line));
          } else if (line.includes('[Plugins]') || line.includes('[PluginWatcher]') || line.includes('[DevSocket]') || line.includes('[HookManager]')) {
            console.log(chalk.yellow(line));
          } else {
            console.log(chalk.dim(line));
          }
        });

        child.stderr.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (!line) return;
          console.log(chalk.red(line));
        });

        child.on('close', (code: number) => {
          log.blank();
          if (code === 0) {
            log.info('Servidor detenido');
          } else {
            log.error(`Servidor terminado con codigo ${code}`);
          }
        });

        // Capturar Ctrl+C
        process.on('SIGINT', () => {
          child.kill('SIGINT');
        });
      } catch (err: any) {
        log.error('Error al arrancar: ' + err.message);
        log.dim(`  Ejecuta manualmente: cd ${root} && npm run dev:server`);
      }
    });
}
