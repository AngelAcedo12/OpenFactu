import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getPublicDb, testConnection, disconnect, schema, sql, eq } from '../utils/db';
import { log } from '../utils/logger';

export function registerSetupCommand(program: Command) {
  program
    .command('setup')
    .description('Configuración inicial de OpenFactu')
    .action(async () => {
      console.log();
      console.log(chalk.bold.white('  OpenFactu — Setup Inicial'));
      console.log(chalk.dim('  ────────────────────────────────────'));
      console.log();

      try {
        // 1. Verificar conexión
        const connSpinner = ora('Verificando conexión a la base de datos...').start();
        const connected = await testConnection();

        if (!connected) {
          connSpinner.fail('No se pudo conectar a la base de datos');
          log.blank();
          log.warn('Verifica que DATABASE_URL esté configurado en .env');
          log.warn('Ejemplo: DATABASE_URL=postgresql://openfactu:openfactu_pass@localhost:5432/openfactudb');
          return;
        }
        connSpinner.succeed('Conexión a la base de datos establecida');

        const publicDb = getPublicDb();

        // 2. Crear tablas del schema público
        const schemaSpinner = ora('Verificando schema público...').start();
        try {
          // Verificar si la tabla Tenant existe
          await publicDb.execute(sql.raw('SELECT 1 FROM "Tenant" LIMIT 1'));
          schemaSpinner.succeed('Schema público OK');
        } catch {
          schemaSpinner.text = 'Creando tablas del schema público...';
          // Las tablas se crean con drizzle push — aquí solo verificamos
          schemaSpinner.warn('Schema público necesita inicialización. Ejecuta: npm run db:push:public');
          return;
        }

        // 3. Verificar/crear admin
        const adminSpinner = ora('Verificando usuario administrador...').start();
        const [existingAdmin] = await publicDb
          .select()
          .from(schema.globalUsers)
          .where(eq(schema.globalUsers.username, 'admin'));

        if (existingAdmin) {
          adminSpinner.succeed('Usuario admin ya existe');
        } else {
          adminSpinner.text = 'Creando usuario administrador...';

          const { adminPassword } = await inquirer.prompt([
            {
              type: 'password',
              name: 'adminPassword',
              message: 'Password para el usuario admin:',
              default: 'admin123',
              mask: '*',
            },
          ]);

          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await publicDb.insert(schema.globalUsers).values({
            id: crypto.randomUUID(),
            email: 'admin@openfactu.com',
            username: 'admin',
            password: hashedPassword,
            role: 'SUPERUSER',
          });

          adminSpinner.succeed('Usuario admin creado (admin@openfactu.com)');
        }

        // 4. Verificar/crear primer tenant
        const tenants = await publicDb.select().from(schema.tenants);

        if (tenants.length > 0) {
          log.success(`${tenants.length} tenant(s) ya existen`);
        } else {
          log.blank();
          const { createTenant } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'createTenant',
              message: 'No hay empresas. ¿Crear la primera?',
              default: true,
            },
          ]);

          if (createTenant) {
            const { tenantName } = await inquirer.prompt([
              {
                type: 'input',
                name: 'tenantName',
                message: 'Nombre de la empresa:',
                default: 'Mi Empresa',
              },
            ]);

            const schemaName = 'tenant_' + tenantName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');

            const tenantSpinner = ora(`Creando empresa "${tenantName}"...`).start();

            const tenantId = crypto.randomUUID();
            await publicDb.insert(schema.tenants).values({
              id: tenantId,
              name: tenantName,
              schemaName,
              config: JSON.stringify({ createdAt: new Date(), createdBy: 'CLI Setup' }),
              updatedAt: new Date(),
            });

            await publicDb.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
            tenantSpinner.succeed(`Empresa "${tenantName}" creada (${schemaName})`);

            // Asignar admin al tenant
            const [admin] = await publicDb
              .select()
              .from(schema.globalUsers)
              .where(eq(schema.globalUsers.username, 'admin'));

            if (admin) {
              await publicDb.insert(schema.userTenantMemberships).values({
                id: crypto.randomUUID(),
                userId: admin.id,
                tenantId,
                role: 'ADMIN',
              });
              log.success('Admin asignado a la empresa');
            }

            log.info('Ejecuta "openfactu migrate" para aplicar migraciones al nuevo tenant');
          }
        }

        log.blank();
        log.success(chalk.bold('Setup completado'));
        log.blank();
        log.dim('  Próximos pasos:');
        log.dim('    openfactu migrate        — Aplicar migraciones');
        log.dim('    openfactu tenant list     — Ver empresas');
        log.dim('    openfactu version         — Ver versiones');
        log.blank();
      } catch (err: any) {
        log.error(err.message);
        process.exitCode = 1;
      } finally {
        await disconnect();
      }
    });
}
