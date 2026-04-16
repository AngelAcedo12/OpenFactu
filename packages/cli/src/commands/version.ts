import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { getProjectRoot } from '../utils/paths';

export function registerVersionCommand(program: Command) {
  program
    .command('version')
    .description('Muestra la versión de OpenFactu')
    .action(() => {
      let root: string;
      try {
        root = getProjectRoot();
      } catch {
        root = '';
      }

      const cliPkg = readPkg(path.resolve(__dirname, '../../package.json'));
      const serverPkg = root ? readPkg(path.join(root, 'apps/server/package.json')) : null;
      const webPkg = root ? readPkg(path.join(root, 'apps/web/package.json')) : null;
      const rootPkg = root ? readPkg(path.join(root, 'package.json')) : null;

      console.log();
      console.log(chalk.bold.white('  OpenFactu'));
      console.log(chalk.dim('  ─────────────────────────────'));
      console.log(`  ${chalk.dim('CLI:')}      ${chalk.cyan(cliPkg?.version || '?')}`);
      console.log(`  ${chalk.dim('Server:')}   ${chalk.cyan(serverPkg?.version || '?')}`);
      console.log(`  ${chalk.dim('Web:')}      ${chalk.cyan(webPkg?.version || '?')}`);
      console.log(`  ${chalk.dim('Root:')}     ${chalk.cyan(rootPkg?.version || '?')}`);
      console.log(`  ${chalk.dim('Node:')}     ${chalk.cyan(process.version)}`);
      if (root) {
        console.log(`  ${chalk.dim('Path:')}     ${chalk.dim(root)}`);
      }
      console.log();
    });
}

function readPkg(pkgPath: string): any {
  try {
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    }
  } catch {}
  return null;
}
