import path from 'path';
import fs from 'fs';

const testPlugin = () => {
  const pluginPath = '/home/angel/Escritorio/dev/OpenFactu/plugins/example-plugin/index.ts';
  console.log('--- DIAGNÓSTICO DE PLUGINS ---');
  console.log('Ruta objetivo:', pluginPath);
  console.log('¿Existe el archivo?:', fs.existsSync(pluginPath));
  
  try {
    console.log('Intentando require...');
    const mod = require(pluginPath);
    console.log('Módulo cargado:', Object.keys(mod));
    console.log('¿Tiene init?:', typeof mod.init === 'function');
  } catch (err: any) {
    console.error('ERROR AL CARGAR:', err.message);
    if (err.stack) console.error(err.stack);
  }
};

testPlugin();
