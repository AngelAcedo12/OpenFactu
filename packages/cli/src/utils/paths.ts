import path from 'path';
import fs from 'fs';

let _projectRoot: string | null = null;

/**
 * Detecta la raíz del proyecto OpenFactu.
 * Busca en este orden:
 *   1. Variable de entorno OPENFACTU_HOME
 *   2. El directorio actual (si contiene package.json con name "openfactu")
 *   3. Hacia arriba desde el directorio actual
 *   4. Ruta relativa desde el paquete CLI instalado (monorepo)
 */
export function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;

  // 1. Variable de entorno
  if (process.env.OPENFACTU_HOME) {
    const envPath = path.resolve(process.env.OPENFACTU_HOME);
    if (isOpenFactuRoot(envPath)) {
      _projectRoot = envPath;
      return _projectRoot;
    }
  }

  // 2. Directorio actual
  if (isOpenFactuRoot(process.cwd())) {
    _projectRoot = process.cwd();
    return _projectRoot;
  }

  // 3. Buscar hacia arriba desde el cwd
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (isOpenFactuRoot(dir)) {
      _projectRoot = dir;
      return _projectRoot;
    }
    dir = path.dirname(dir);
  }

  // 4. Relativo al paquete CLI (dentro del monorepo)
  const monorepoRoot = path.resolve(__dirname, '../../../..');
  if (isOpenFactuRoot(monorepoRoot)) {
    _projectRoot = monorepoRoot;
    return _projectRoot;
  }

  throw new Error(
    'No se encontró la instalación de OpenFactu.\n' +
    'Opciones:\n' +
    '  1. Ejecuta el comando desde el directorio de OpenFactu\n' +
    '  2. Configura OPENFACTU_HOME=/ruta/a/OpenFactu\n',
  );
}

/**
 * Setea manualmente la raíz del proyecto.
 */
export function setProjectRoot(root: string) {
  _projectRoot = root;
}

function isOpenFactuRoot(dir: string): boolean {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    // Detectar por nombre o por la estructura de workspaces
    return pkg.name === 'openfactu' || (pkg.workspaces && fs.existsSync(path.join(dir, 'apps/server')));
  } catch {
    return false;
  }
}

// Paths derivados
export function getServerDir() { return path.join(getProjectRoot(), 'apps/server'); }
export function getServerSrcDir() { return path.join(getServerDir(), 'src'); }
export function getMigrationsDir() { return path.join(getServerSrcDir(), 'core/tenant/migrations'); }
export function getPluginsDir() { return path.join(getProjectRoot(), 'plugins'); }
export function getEnvPath() { return path.join(getProjectRoot(), '.env'); }
