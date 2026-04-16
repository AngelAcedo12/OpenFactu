#!/usr/bin/env node

// Registrar ts-node para resolver imports de .ts del server
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs', esModuleInterop: true },
  });
} catch {}

// Opción --path para usar desde cualquier directorio
const pathIdx = process.argv.indexOf('--path');
if (pathIdx !== -1 && process.argv[pathIdx + 1]) {
  const { setProjectRoot } = require('../src/utils/paths');
  setProjectRoot(process.argv[pathIdx + 1]);
  // Quitar --path y su valor de argv para que commander no los procese
  process.argv.splice(pathIdx, 2);
}

import { createCLI } from '../src/index';

const program = createCLI();
program.option('--path <dir>', 'Ruta a la instalación de OpenFactu');
program.parse(process.argv);
