/**
 * Resuelve el adapter de almacenamiento adecuado para un tenant.
 *
 *   StorageResolver.forTenant(tenantClient, schemaName)         → activo
 *   StorageResolver.forProvider(provider, tenantClient, schema) → forzado
 *
 * Si la config del tenant indica un provider cloud sin credenciales válidas,
 * caemos al adapter local (es siempre seguro escribir local). Esto evita
 * que un mal config de OAuth tire impresiones u otros flujos.
 */

import path from 'path';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import type { StorageAdapter, StorageProviderId } from './StorageAdapter';
import { getStorageConfig } from '../config/storageConfig';

/**
 * basePath por defecto. En docker el contenedor server tiene `/app/storage`
 * montado como volumen → escribimos en `/app/storage/uploads/`.
 * En dev local desde `apps/server`, el `__dirname` apunta dentro de src/
 * o dist/, así que vamos varios niveles arriba hasta el root del repo y
 * añadimos `storage/uploads`.
 */
function defaultLocalBasePath(): string {
  if (process.env.OPENFACTU_UPLOADS_DIR) return process.env.OPENFACTU_UPLOADS_DIR;
  // __dirname suele ser .../apps/server/{src|dist}/core/storage
  // Subimos 4 niveles → repo root, luego ./storage/uploads
  const guess = path.resolve(__dirname, '..', '..', '..', '..', '..', 'storage', 'uploads');
  return guess;
}

export class StorageResolver {
  /**
   * Devuelve el adapter activo para un tenant (lo que diga `storage.provider`
   * en su `systemConfigs`). Para FREE/recién creados, `local` por defecto.
   */
  static async forTenant(tenantClient: any, _schemaName: string): Promise<StorageAdapter> {
    const cfg = await getStorageConfig(tenantClient);
    return this.buildAdapter(cfg.provider || 'local', cfg);
  }

  /**
   * Devuelve un adapter concreto sin mirar la config — usado al descargar un
   * archivo específico cuya `provider` está fijada en su fila Attachment, así
   * los archivos viejos siguen accesibles aunque el tenant cambie de provider.
   */
  static async forProvider(
    provider: StorageProviderId,
    tenantClient: any,
    _schemaName: string,
  ): Promise<StorageAdapter> {
    const cfg = await getStorageConfig(tenantClient);
    return this.buildAdapter(provider, cfg);
  }

  private static buildAdapter(provider: StorageProviderId, cfg: any): StorageAdapter {
    switch (provider) {
      case 'local':
        return new LocalStorageAdapter({
          basePath: cfg?.local?.basePath || defaultLocalBasePath(),
        });
      case 'gdrive':
      case 'onedrive':
        // Stub: cuando se implementen GoogleDriveAdapter / OneDriveAdapter,
        // se devolverán aquí. Mientras tanto, fallback transparente a local
        // para no romper subidas si alguien marca el provider antes de tiempo.
        console.warn(
          `[StorageResolver] Provider "${provider}" aún no implementado, cayendo a local`,
        );
        return new LocalStorageAdapter({
          basePath: cfg?.local?.basePath || defaultLocalBasePath(),
        });
      default:
        return new LocalStorageAdapter({
          basePath: cfg?.local?.basePath || defaultLocalBasePath(),
        });
    }
  }
}
