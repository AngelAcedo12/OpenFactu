import { Command } from 'commander';
import { registerVersionCommand } from './commands/version';
import { registerMigrateCommand } from './commands/migrate';
import { registerTenantCommand } from './commands/tenant';
import { registerPluginCommand } from './commands/plugin';
import { registerSetupCommand } from './commands/setup';
import { registerUpdateCommand } from './commands/update';
import { registerInstallCommand } from './commands/install';
import { registerDeployCommand } from './commands/deploy';

export function createCLI() {
  const program = new Command();

  program
    .name('openfactu')
    .description('CLI para gestionar OpenFactu')
    .version('0.0.3');

  registerVersionCommand(program);
  registerMigrateCommand(program);
  registerTenantCommand(program);
  registerPluginCommand(program);
  registerSetupCommand(program);
  registerUpdateCommand(program);
  registerInstallCommand(program);
  registerDeployCommand(program);

  return program;
}
