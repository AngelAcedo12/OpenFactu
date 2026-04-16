import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../utils/logger';
import { getProjectRoot } from '../utils/paths';

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        ips.push(info.address);
      }
    }
  }
  return ips;
}

function readEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
  }
  return env;
}

function writeEnv(envPath: string, env: Record<string, string>) {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

export function registerDeployCommand(program: Command) {
  program
    .command('deploy')
    .description('Configura OpenFactu para producción (acceso externo)')
    .action(async () => {
      console.log();
      console.log(chalk.bold.white('  OpenFactu — Configurar Despliegue'));
      console.log(chalk.dim('  ────────────────────────────────────'));
      console.log();

      try {
        const root = getProjectRoot();
        const envPath = path.join(root, '.env');
        const composePath = path.join(root, 'docker-compose.yml');

        // 1. Detectar IPs locales
        const localIPs = getLocalIPs();
        log.info(`IPs detectadas: ${localIPs.join(', ') || 'ninguna'}`);

        // 2. Preguntar configuración
        const { mode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'mode',
            message: 'Tipo de despliegue:',
            choices: [
              { name: `${chalk.green('Red local')} ${chalk.dim('— accesible desde otros equipos en tu red')}`, value: 'lan' },
              { name: `${chalk.cyan('Dominio/IP pública')} ${chalk.dim('— accesible desde internet')}`, value: 'public' },
              { name: `${chalk.dim('Solo localhost')} ${chalk.dim('— solo este equipo')}`, value: 'localhost' },
            ],
          },
        ]);

        let host = 'localhost';
        let serverPort = '3000';
        let webPort = '8080';
        let useSSL = false;

        if (mode === 'lan') {
          const ipChoices = localIPs.map((ip) => ({ name: ip, value: ip }));
          ipChoices.push({ name: 'Otra (escribir manualmente)', value: '__custom__' });

          const { selectedIP } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedIP',
              message: 'IP de la máquina en la red:',
              choices: ipChoices,
            },
          ]);

          if (selectedIP === '__custom__') {
            const { customIP } = await inquirer.prompt([
              { type: 'input', name: 'customIP', message: 'IP:' },
            ]);
            host = customIP;
          } else {
            host = selectedIP;
          }
        } else if (mode === 'public') {
          const { domain } = await inquirer.prompt([
            {
              type: 'input',
              name: 'domain',
              message: 'Dominio o IP pública (ej: erp.miempresa.com):',
            },
          ]);
          host = domain;

          const { ssl } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'ssl',
              message: '¿Usar HTTPS (SSL)?',
              default: true,
            },
          ]);
          useSSL = ssl;
        }

        // Puertos
        const { ports } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ports',
            message: `¿Usar puertos por defecto? (web: 8080, api: 3000)`,
            default: true,
          },
        ]);

        if (!ports) {
          const answers = await inquirer.prompt([
            { type: 'input', name: 'webPort', message: 'Puerto web:', default: '8080' },
            { type: 'input', name: 'serverPort', message: 'Puerto API:', default: '3000' },
          ]);
          webPort = answers.webPort;
          serverPort = answers.serverPort;
        }

        // Password de BD
        const { dbPassword } = await inquirer.prompt([
          {
            type: 'input',
            name: 'dbPassword',
            message: 'Password de PostgreSQL:',
            default: 'openfactu_pass',
          },
        ]);

        // 3. Construir configuración
        const protocol = useSSL ? 'https' : 'http';
        const webUrl = webPort === '80' || webPort === '443'
          ? `${protocol}://${host}`
          : `${protocol}://${host}:${webPort}`;
        const apiUrl = serverPort === '80' || serverPort === '443'
          ? `${protocol}://${host}`
          : `${protocol}://${host}:${serverPort}`;

        log.blank();
        log.title('  Resumen de configuración');
        log.info(`Web:         ${chalk.cyan(webUrl)}`);
        log.info(`API:         ${chalk.cyan(apiUrl)}`);
        log.info(`BD Password: ${chalk.dim(dbPassword === 'openfactu_pass' ? '(default)' : '****')}`);
        log.info(`SSL:         ${useSSL ? chalk.green('Si') : chalk.dim('No')}`);
        log.blank();

        const { confirm } = await inquirer.prompt([
          { type: 'confirm', name: 'confirm', message: 'Aplicar configuración?', default: true },
        ]);

        if (!confirm) {
          log.info('Cancelado');
          return;
        }

        // 4. Escribir .env
        const envSpinner = ora('Configurando .env...').start();
        const env = readEnv(envPath);
        env.SERVER_PORT = serverPort;
        env.WEB_PORT = webPort;
        env.DB_PORT = env.DB_PORT || '5432';
        env.POSTGRES_USER = env.POSTGRES_USER || 'openfactu';
        env.POSTGRES_PASSWORD = dbPassword;
        env.POSTGRES_DB = env.POSTGRES_DB || 'openfactudb';
        env.DATABASE_URL = `postgresql://${env.POSTGRES_USER}:${dbPassword}@db:5432/${env.POSTGRES_DB}`;
        env.VITE_API_URL = apiUrl;
        env.HOST = host;
        env.CORS_ORIGIN = webUrl;
        writeEnv(envPath, env);
        envSpinner.succeed('.env configurado');

        // 5. Generar docker-compose.prod.yml con bind a 0.0.0.0
        const prodComposePath = path.join(root, 'docker-compose.prod.yml');
        const prodSpinner = ora('Generando docker-compose.prod.yml...').start();

        let composeContent = `version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_URL: "${apiUrl}"
    ports:
      - "0.0.0.0:${webPort}:80"
    environment:
      VITE_API_URL: "${apiUrl}"
    depends_on:
      - server
    restart: unless-stopped
    networks:
      - openfactu_net

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "0.0.0.0:${serverPort}:3000"
    env_file:
      - .env
    volumes:
      - ./plugins:/app/plugins
      - ./storage:/app/storage
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://\${POSTGRES_USER:-openfactu}:\${POSTGRES_PASSWORD:-openfactu_pass}@db:5432/\${POSTGRES_DB:-openfactudb}
      - CORS_ORIGIN=${webUrl}
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - openfactu_net

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-openfactu}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-openfactu_pass}
      POSTGRES_DB: \${POSTGRES_DB:-openfactudb}
    ports:
      - "127.0.0.1:\${DB_PORT:-5432}:5432"
    volumes:
      - ./storage/db_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - openfactu_net

networks:
  openfactu_net:
    driver: bridge
`;

        // Si SSL, añadir nginx reverse proxy
        if (useSSL) {
          composeContent += `
  # Para SSL, configura un reverse proxy (nginx, traefik, caddy) delante.
  # Ejemplo con Caddy (descomentar):
  #
  # caddy:
  #   image: caddy:2-alpine
  #   ports:
  #     - "0.0.0.0:80:80"
  #     - "0.0.0.0:443:443"
  #   volumes:
  #     - ./Caddyfile:/etc/caddy/Caddyfile
  #     - caddy_data:/data
  #   depends_on:
  #     - web
  #     - server
  #   networks:
  #     - openfactu_net
  #
  # volumes:
  #   caddy_data:
  #
  # Caddyfile:
  #   ${host} {
  #     handle /api/* {
  #       reverse_proxy server:3000
  #     }
  #     handle {
  #       reverse_proxy web:80
  #     }
  #   }
`;
        }

        fs.writeFileSync(prodComposePath, composeContent);
        prodSpinner.succeed('docker-compose.prod.yml generado');

        // 6. Preguntar si levantar
        log.blank();
        const { start } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'start',
            message: '¿Levantar los servicios ahora?',
            default: true,
          },
        ]);

        if (start) {
          const startSpinner = ora('Construyendo y levantando servicios...').start();
          try {
            execSync('docker compose -f docker-compose.prod.yml up -d --build', {
              cwd: root,
              stdio: 'pipe',
              timeout: 300000,
            });
            startSpinner.succeed('Servicios levantados');
          } catch (err: any) {
            startSpinner.fail('Error: ' + err.message);
            log.dim('  Ejecuta manualmente:');
            log.dim(`  cd ${root} && docker compose -f docker-compose.prod.yml up -d --build`);
          }
        }

        log.blank();
        console.log(chalk.bold.green('  Despliegue configurado'));
        console.log(chalk.dim('  ────────────────────────────────────'));
        console.log(`  ${chalk.dim('Web:')}  ${chalk.cyan(webUrl)}`);
        console.log(`  ${chalk.dim('API:')}  ${chalk.cyan(apiUrl)}`);
        log.blank();

        if (mode === 'lan') {
          log.info('Accede desde otros equipos de la red con la URL de arriba');
        } else if (mode === 'public') {
          log.info('Asegúrate de que los puertos estén abiertos en el firewall');
          if (useSSL) {
            log.info('Configura el reverse proxy (Caddy/Nginx) para SSL');
          }
        }

        log.blank();
        log.dim('  Comandos útiles:');
        log.dim(`  docker compose -f docker-compose.prod.yml logs -f    — Ver logs`);
        log.dim(`  docker compose -f docker-compose.prod.yml down       — Parar`);
        log.dim(`  docker compose -f docker-compose.prod.yml restart    — Reiniciar`);
        log.blank();
      } catch (err: any) {
        log.error(err.message);
        process.exitCode = 1;
      }
    });

  // ── openfactu deploy:status ──
  program
    .command('deploy:status')
    .description('Muestra el estado de los servicios Docker')
    .action(async () => {
      try {
        const root = getProjectRoot();
        const prodCompose = path.join(root, 'docker-compose.prod.yml');
        const composeFile = fs.existsSync(prodCompose) ? 'docker-compose.prod.yml' : 'docker-compose.yml';

        log.info(`Usando: ${chalk.dim(composeFile)}`);
        log.blank();

        const output = execSync(`docker compose -f ${composeFile} ps`, {
          cwd: root,
        }).toString();

        console.log(output);

        // Mostrar URLs
        const envPath = path.join(root, '.env');
        const env = readEnv(envPath);
        const host = env.HOST || 'localhost';
        const webPort = env.WEB_PORT || '8080';
        const serverPort = env.SERVER_PORT || '3000';
        const protocol = env.VITE_API_URL?.startsWith('https') ? 'https' : 'http';

        log.blank();
        log.info(`Web: ${chalk.cyan(`${protocol}://${host}:${webPort}`)}`);
        log.info(`API: ${chalk.cyan(`${protocol}://${host}:${serverPort}`)}`);
      } catch (err: any) {
        log.error('Docker no disponible o servicios no levantados');
        log.dim('  ' + err.message);
      }
    });
}
