import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger';

const REPO_URL = 'https://github.com/AngelAcedo12/OpenFactu.git';
const GITHUB_OWNER = 'AngelAcedo12';
const GITHUB_REPO = 'OpenFactu';

interface GithubRelease {
  tag_name: string;
  name: string;
  prerelease: boolean;
  draft: boolean;
  published_at: string;
  body: string;
}

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'openfactu-cli' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Respuesta no es JSON'));
        }
      });
    }).on('error', reject);
  });
}

async function getGithubReleases(): Promise<GithubRelease[]> {
  try {
    const data = await fetchJSON(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`);
    if (!Array.isArray(data)) return [];
    return data.filter((r: any) => !r.draft);
  } catch {
    return [];
  }
}

function getAvailableBranches(): string[] {
  try {
    const output = execSync(`git ls-remote --heads ${REPO_URL}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    }).toString().trim();

    if (!output) return [];

    return output
      .split('\n')
      .map((line) => {
        const match = line.match(/refs\/heads\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter((b): b is string => b !== null);
  } catch {
    return [];
  }
}

function checkDocker(): boolean {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker compose version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function registerInstallCommand(program: Command) {
  program
    .command('install [directory]')
    .description('Descarga e instala OpenFactu en un directorio')
    .option('-t, --tag <tag>', 'Versión/tag específico (ej: v1.0.0)')
    .option('-b, --branch <branch>', 'Branch específica (default: main)')
    .option('--repo <url>', 'URL del repositorio', REPO_URL)
    .option('--skip-deps', 'No instalar dependencias (npm install)')
    .action(async (directory, opts) => {
      console.log();
      console.log(chalk.bold.white('  OpenFactu — Instalación'));
      console.log(chalk.dim('  ────────────────────────────────────'));
      console.log();

      try {
        const repoUrl = opts.repo;

        // 1. Obtener releases de GitHub
        const fetchSpinner = ora('Consultando releases en GitHub...').start();
        const releases = await getGithubReleases();
        const branches = getAvailableBranches();
        fetchSpinner.succeed(`${releases.length} release(s), ${branches.length} branches disponibles`);

        // 2. Elegir versión
        let ref: string;

        if (opts.tag) {
          ref = opts.tag;
        } else if (opts.branch) {
          ref = opts.branch;
        } else {
          // Menú interactivo
          const choices: any[] = [];

          // Releases estables primero
          const stable = releases.filter((r) => !r.prerelease);
          const prerelease = releases.filter((r) => r.prerelease);

          for (const rel of stable.slice(0, 10)) {
            const date = new Date(rel.published_at).toLocaleDateString('es-ES');
            choices.push({
              name: `${chalk.green(rel.tag_name)} ${chalk.white(rel.name || '')} ${chalk.dim(`(${date})`)}`,
              value: rel.tag_name,
            });
          }

          if (prerelease.length > 0) {
            choices.push(new inquirer.Separator(chalk.dim('── Pre-releases ──')));
            for (const rel of prerelease.slice(0, 5)) {
              const date = new Date(rel.published_at).toLocaleDateString('es-ES');
              choices.push({
                name: `${chalk.yellow(rel.tag_name)} ${chalk.white(rel.name || '')} ${chalk.dim(`(${date}) pre-release`)}`,
                value: rel.tag_name,
              });
            }
          }

          if (branches.length > 0) {
            choices.push(new inquirer.Separator(chalk.dim('── Branches ──')));
            for (const branch of branches) {
              const label = branch === 'main' ? chalk.dim('(última versión)') : '';
              choices.push({
                name: `${chalk.cyan(branch)} ${label}`,
                value: branch,
              });
            }
          }

          if (choices.length === 0) {
            choices.push({ name: 'main (default)', value: 'main' });
          }

          const { selected } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selected',
              message: 'Selecciona la versión a instalar:',
              choices,
              pageSize: 15,
            },
          ]);

          ref = selected;
        }

        log.info(`Versión seleccionada: ${chalk.cyan(ref)}`);

        // 3. Directorio destino
        let targetDir = directory;

        if (!targetDir) {
          const { dir } = await inquirer.prompt([
            {
              type: 'input',
              name: 'dir',
              message: 'Directorio de instalación:',
              default: path.join(process.cwd(), 'openfactu'),
            },
          ]);
          targetDir = dir;
        }

        targetDir = path.resolve(targetDir);

        // Verificar si el directorio ya existe
        if (fs.existsSync(targetDir)) {
          const contents = fs.readdirSync(targetDir);
          if (contents.length > 0) {
            const { overwrite } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'overwrite',
                message: `El directorio ${targetDir} no está vacío. ¿Continuar?`,
                default: false,
              },
            ]);
            if (!overwrite) {
              log.info('Instalación cancelada');
              return;
            }
          }
        }

        log.info(`Directorio: ${chalk.dim(targetDir)}`);
        log.blank();

        // 4. Clonar repositorio
        const cloneSpinner = ora('Descargando OpenFactu...').start();

        const isTag = releases.some((r) => r.tag_name === ref);

        try {
          if (isTag) {
            // Para tags: clonar y luego checkout al tag
            execSync(
              `git clone --depth 1 --branch ${ref} ${repoUrl} "${targetDir}"`,
              { stdio: 'pipe', timeout: 120000 },
            );
          } else {
            // Para branches: clonar la branch directamente
            execSync(
              `git clone --branch ${ref} ${repoUrl} "${targetDir}"`,
              { stdio: 'pipe', timeout: 120000 },
            );
          }
          cloneSpinner.succeed('Código descargado');
        } catch (err: any) {
          // Fallback: clonar todo y checkout
          try {
            cloneSpinner.text = 'Descargando (método alternativo)...';
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            execSync(`git clone ${repoUrl} "${targetDir}"`, { stdio: 'pipe', timeout: 180000 });
            execSync(`git checkout ${ref}`, { cwd: targetDir, stdio: 'pipe' });
            cloneSpinner.succeed('Código descargado');
          } catch (err2: any) {
            cloneSpinner.fail('Error al descargar: ' + err2.message);
            return;
          }
        }

        // 5. Copiar .env.example a .env
        const envExample = path.join(targetDir, '.env.example');
        const envFile = path.join(targetDir, '.env');
        if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
          fs.copyFileSync(envExample, envFile);
          log.success('Archivo .env creado desde .env.example');
        }

        // 6. Preguntar modo de instalación
        const hasDocker = checkDocker();

        if (!hasDocker) {
          log.warn('Docker no detectado. OpenFactu requiere Docker para funcionar.');
          log.dim('  Instala Docker Desktop: https://docs.docker.com/get-docker/');
          log.blank();
        }

        const { installMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'installMode',
            message: 'Modo de instalación:',
            choices: [
              ...(hasDocker ? [{
                name: `${chalk.green('Docker')} ${chalk.dim('— recomendado, funciona en Windows/Mac/Linux')}`,
                value: 'docker',
              }] : []),
              {
                name: `${chalk.dim('Solo descargar')} ${chalk.dim('— instalar dependencias manualmente después')}`,
                value: 'none',
              },
            ],
          },
        ]);

        if (installMode === 'docker') {
          // Docker: build + up
          const dockerSpinner = ora('Construyendo contenedores Docker...').start();
          try {
            execSync('docker compose build', { cwd: targetDir, stdio: 'pipe', timeout: 300000 });
            dockerSpinner.succeed('Contenedores construidos');

            const { startNow } = await inquirer.prompt([
              { type: 'confirm', name: 'startNow', message: '¿Arrancar los servicios?', default: true },
            ]);

            if (startNow) {
              const upSpinner = ora('Levantando servicios...').start();
              execSync('docker compose up -d', { cwd: targetDir, stdio: 'pipe', timeout: 120000 });
              upSpinner.succeed('Servicios levantados');
            }
          } catch (err: any) {
            dockerSpinner.fail('Error Docker: ' + err.message);
            log.dim(`  Ejecuta manualmente: cd ${targetDir} && docker compose up -d`);
          }
        }

        // 7. Resumen
        const installedPkg = path.join(targetDir, 'package.json');
        let installedVersion = '?';
        if (fs.existsSync(installedPkg)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(installedPkg, 'utf-8'));
            installedVersion = pkg.version || '?';
          } catch {}
        }

        let installedCommit = '?';
        try {
          installedCommit = execSync('git rev-parse --short HEAD', { cwd: targetDir }).toString().trim();
        } catch {}

        log.blank();
        console.log(chalk.bold.green('  Instalación completada'));
        console.log(chalk.dim('  ────────────────────────────────────'));
        console.log(`  ${chalk.dim('Versión:')}    ${chalk.cyan(installedVersion)}`);
        console.log(`  ${chalk.dim('Ref:')}        ${chalk.cyan(ref)}`);
        console.log(`  ${chalk.dim('Commit:')}     ${chalk.cyan(installedCommit)}`);
        console.log(`  ${chalk.dim('Directorio:')} ${chalk.white(targetDir)}`);
        console.log(`  ${chalk.dim('Modo:')}       ${chalk.white(installMode)}`);
        log.blank();

        log.dim('  Próximos pasos:');
        log.dim(`    cd ${targetDir}`);
        if (installMode === 'docker') {
          log.dim('    openfactu deploy         — Configurar acceso externo');
          log.dim('    openfactu deploy:status  — Ver estado de servicios');
        } else {
          log.dim('    docker compose up -d     — Levantar con Docker');
          log.dim('    openfactu deploy         — Configurar acceso externo');
        }
        log.blank();
      } catch (err: any) {
        log.error(err.message);
        process.exitCode = 1;
      }
    });
}
