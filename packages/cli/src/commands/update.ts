import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger';
import { getProjectRoot } from '../utils/paths';

const ROOT_DIR = getProjectRoot();
const BACKUP_DIRS = ['storage', 'plugins', '.env'];
const SAFE_DIRS = ['storage', 'plugins', 'node_modules', '.env', '.git'];

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function hasUncommittedChanges(): boolean {
  try {
    const output = execSync('git status --porcelain', { cwd: ROOT_DIR }).toString().trim();
    return output.length > 0;
  } catch {
    return true;
  }
}

function getRemoteTags(): string[] {
  try {
    execSync('git fetch --tags', { cwd: ROOT_DIR, stdio: 'pipe' });
    const output = execSync('git tag --list "v*" --sort=-version:refname', { cwd: ROOT_DIR }).toString().trim();
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

function getRemoteLatestCommit(branch: string): string {
  try {
    execSync('git fetch origin', { cwd: ROOT_DIR, stdio: 'pipe' });
    return execSync(`git rev-parse --short origin/${branch}`, { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
}

export function registerUpdateCommand(program: Command) {
  // ── openfactu update ──
  program
    .command('update')
    .description('Actualiza OpenFactu a la última versión')
    .option('--branch <branch>', 'Branch específica (default: main)')
    .option('--tag <tag>', 'Tag/versión específica (ej: v1.2.0)')
    .option('--force', 'Forzar actualización sin confirmación')
    .action(async (opts) => {
      console.log();
      console.log(chalk.bold.white('  OpenFactu — Actualización'));
      console.log(chalk.dim('  ────────────────────────────────────'));
      console.log();

      try {
        const currentVersion = getCurrentVersion();
        const currentBranch = getCurrentBranch();
        const currentCommit = getCurrentCommit();

        log.info(`Versión actual:  ${chalk.cyan(currentVersion)}`);
        log.info(`Branch:          ${chalk.cyan(currentBranch)}`);
        log.info(`Commit:          ${chalk.cyan(currentCommit)}`);
        log.blank();

        // 1. Verificar cambios sin commitear
        if (hasUncommittedChanges()) {
          log.warn('Hay cambios sin commitear en el repositorio');

          if (!opts.force) {
            const { proceed } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'proceed',
                message: 'Hay cambios locales. ¿Continuar? (se hará stash automático)',
                default: false,
              },
            ]);
            if (!proceed) {
              log.info('Actualización cancelada');
              return;
            }
          }

          // Guardar cambios locales
          const stashSpinner = ora('Guardando cambios locales (git stash)...').start();
          try {
            execSync('git stash push -m "openfactu-cli-update-backup"', { cwd: ROOT_DIR, stdio: 'pipe' });
            stashSpinner.succeed('Cambios locales guardados en stash');
          } catch (err: any) {
            stashSpinner.warn('No se pudieron guardar cambios: ' + err.message);
          }
        }

        // 2. Fetch remoto
        const fetchSpinner = ora('Descargando información del repositorio...').start();
        try {
          execSync('git fetch --all --tags', { cwd: ROOT_DIR, stdio: 'pipe' });
          fetchSpinner.succeed('Repositorio actualizado');
        } catch (err: any) {
          fetchSpinner.fail('No se pudo conectar al repositorio remoto: ' + err.message);
          return;
        }

        // 3. Determinar versión objetivo
        let target: string;

        if (opts.tag) {
          // Actualizar a un tag específico
          target = opts.tag;
          log.info(`Actualizando al tag: ${chalk.bold(target)}`);
        } else {
          const branch = opts.branch || currentBranch || 'main';
          const remoteCommit = getRemoteLatestCommit(branch);

          if (remoteCommit === currentCommit) {
            log.success('Ya estás en la última versión');
            return;
          }

          // Mostrar commits pendientes
          try {
            const behindCount = execSync(
              `git rev-list --count HEAD..origin/${branch}`,
              { cwd: ROOT_DIR },
            ).toString().trim();

            log.info(`Commits nuevos disponibles: ${chalk.yellow(behindCount)}`);

            // Mostrar resumen de cambios
            const changelog = execSync(
              `git log --oneline HEAD..origin/${branch} --max-count=10`,
              { cwd: ROOT_DIR },
            ).toString().trim();

            if (changelog) {
              log.blank();
              log.dim('  Cambios recientes:');
              for (const line of changelog.split('\n')) {
                log.dim(`    ${line}`);
              }
              log.blank();
            }
          } catch {}

          target = `origin/${branch}`;
        }

        // 4. Confirmación
        if (!opts.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `¿Actualizar a ${target}?`,
              default: true,
            },
          ]);
          if (!confirm) {
            log.info('Actualización cancelada');
            return;
          }
        }

        // 5. Backup de configuración
        const backupSpinner = ora('Verificando archivos protegidos...').start();
        const protectedFiles: string[] = [];

        for (const item of BACKUP_DIRS) {
          const itemPath = path.join(ROOT_DIR, item);
          if (fs.existsSync(itemPath)) {
            protectedFiles.push(item);
          }
        }
        backupSpinner.succeed(`Archivos protegidos: ${protectedFiles.join(', ') || 'ninguno'}`);

        // 6. Aplicar actualización
        const updateSpinner = ora('Aplicando actualización...').start();

        try {
          if (opts.tag) {
            execSync(`git checkout ${opts.tag}`, { cwd: ROOT_DIR, stdio: 'pipe' });
          } else {
            const branch = opts.branch || currentBranch || 'main';
            execSync(`git pull origin ${branch} --ff-only`, { cwd: ROOT_DIR, stdio: 'pipe' });
          }
          updateSpinner.succeed('Código actualizado');
        } catch (err: any) {
          updateSpinner.fail('Error al actualizar: ' + err.message);
          log.warn('Intentando merge...');
          try {
            const branch = opts.branch || currentBranch || 'main';
            execSync(`git pull origin ${branch}`, { cwd: ROOT_DIR, stdio: 'pipe' });
            log.success('Merge completado');
          } catch (mergeErr: any) {
            log.error('Conflicto de merge. Resuelve manualmente con:');
            log.dim('  git status');
            log.dim('  git merge --abort  (para cancelar)');
            return;
          }
        }

        // 7. Instalar dependencias
        const depsSpinner = ora('Instalando dependencias...').start();
        try {
          execSync('npm install', { cwd: ROOT_DIR, stdio: 'pipe', timeout: 120000 });
          depsSpinner.succeed('Dependencias instaladas');
        } catch (err: any) {
          depsSpinner.warn('Error instalando dependencias: ' + err.message);
        }

        // 8. Mostrar nueva versión
        const newVersion = getCurrentVersion();
        const newCommit = getCurrentCommit();

        log.blank();
        log.success(chalk.bold('Actualización completada'));
        log.blank();
        log.info(`Versión: ${chalk.dim(currentVersion)} ${chalk.white('→')} ${chalk.cyan(newVersion)}`);
        log.info(`Commit:  ${chalk.dim(currentCommit)} ${chalk.white('→')} ${chalk.cyan(newCommit)}`);
        log.blank();
        log.dim('  Próximos pasos:');
        log.dim('    openfactu migrate        — Aplicar migraciones de BD pendientes');
        log.dim('    openfactu migrate:status  — Ver estado de migraciones');
        log.blank();
      } catch (err: any) {
        log.error(err.message);
        process.exitCode = 1;
      }
    });

  // ── openfactu update:check ──
  program
    .command('update:check')
    .description('Comprueba si hay actualizaciones disponibles')
    .action(async () => {
      const spinner = ora('Comprobando actualizaciones...').start();

      try {
        const currentVersion = getCurrentVersion();
        const currentBranch = getCurrentBranch();
        const currentCommit = getCurrentCommit();

        execSync('git fetch --all --tags', { cwd: ROOT_DIR, stdio: 'pipe' });

        const remoteCommit = getRemoteLatestCommit(currentBranch);
        const tags = getRemoteTags();

        spinner.stop();

        log.info(`Versión actual:  ${chalk.cyan(currentVersion)} (${currentCommit})`);
        log.info(`Branch:          ${chalk.cyan(currentBranch)}`);

        if (remoteCommit === currentCommit) {
          log.success('Estás en la última versión');
        } else {
          const behindCount = execSync(
            `git rev-list --count HEAD..origin/${currentBranch}`,
            { cwd: ROOT_DIR },
          ).toString().trim();

          log.warn(`Hay ${chalk.yellow(behindCount)} commit(s) nuevos disponibles`);
          log.dim(`  Ejecuta: openfactu update`);
        }

        if (tags.length > 0) {
          log.blank();
          log.info('Versiones disponibles (tags):');
          for (const tag of tags.slice(0, 5)) {
            const isCurrent = tag === `v${currentVersion}`;
            console.log(`  ${isCurrent ? chalk.green('→') : ' '} ${chalk.cyan(tag)}${isCurrent ? chalk.dim(' (actual)') : ''}`);
          }
          if (tags.length > 5) {
            log.dim(`  ... y ${tags.length - 5} más`);
          }
        }
      } catch (err: any) {
        spinner.fail('No se pudo comprobar: ' + err.message);
        process.exitCode = 1;
      }
    });
}
