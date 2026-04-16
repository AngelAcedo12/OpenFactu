import * as esbuild from 'esbuild';

/**
 * Mapeo de paquetes externos a sus URLs en el servidor SDK.
 * El navegador resolverá estas URLs directamente contra el servidor.
 */
const EXTERNAL_PACKAGE_MAP: Record<string, string> = {
  react: 'http://localhost:3000/api/plugins/sdk/react.js',
  'react-dom': 'http://localhost:3000/api/plugins/sdk/react-dom.js',
  'lucide-react': 'http://localhost:3000/api/plugins/sdk/lucide-react.js',
  '@openfactu/ui': 'http://localhost:3000/api/plugins/sdk/@openfactu/ui.js',
  'react-router-dom': 'http://localhost:3000/api/plugins/sdk/react-router-dom.js',
};

/**
 * Plugin de esbuild que reescribe los bare imports a URLs absolutas del servidor.
 * Esto permite que el navegador resuelva las dependencias externas correctamente.
 */
const sdkResolverPlugin: esbuild.Plugin = {
  name: 'sdk-resolver',
  setup(build) {
    // Interceptar la resolución de los paquetes externos
    build.onResolve(
      { filter: /^(react|react-dom|lucide-react|@openfactu\/ui|react-router-dom)/ },
      (args) => {
        const url = EXTERNAL_PACKAGE_MAP[args.path];
        if (url) {
          return {
            path: url,
            external: true, // Decirle a esbuild que no lo empaquete
          };
        }
        return null;
      },
    );
  },
};

/**
 * Transpila un archivo (.tsx, .ts) a un módulo ESM compatible con el navegador.
 * Las dependencias externas se reescriben como URLs absolutas del servidor SDK.
 */
export const transpilePluginFile = async (filePath: string): Promise<string> => {
  try {
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      minify: process.env.NODE_ENV === 'production',
      plugins: [sdkResolverPlugin],
      write: false,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.js': 'js',
        '.jsx': 'jsx',
        '.css': 'css',
        '.json': 'json',
      },
    });

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error('Esbuild no produjo salida');
    }

    return result.outputFiles[0].text;
  } catch (error) {
    console.error(`[Transpiler] Error al transpilar ${filePath}:`, error);
    throw error;
  }
};
