import { ClientFactory } from '../tenant/ClientFactory';
import * as schema from '../../db/schema';
import { AuthService } from './AuthService';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Asegura que exista un usuario administrador al iniciar el sistema.
 */
export async function bootstrapAdmin() {
  const db = ClientFactory.getClient('public');

  console.log('[Bootstrap] Verificando integridad del sistema...');

  try {
    // 1. Buscar si ya existe el admin
    const [admin] = await db
      .select()
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.username, 'admin'));

    if (!admin) {
      console.log('[Bootstrap] ⚠️ No se encontró administrador. Creando uno por defecto...');

      const hashedPassword = await AuthService.hashPassword('admin123');

      await db.insert(schema.globalUsers).values({
        id: crypto.randomUUID(),
        email: 'admin@openfactu.com',
        username: 'admin',
        password: hashedPassword,
        role: 'SUPERUSER',
      });

      console.log('[Bootstrap] ✅ Administrador creado: admin / admin123');
    } else {
      console.log('[Bootstrap] ℹ️ El usuario administrador ya existe.');
    }
  } catch (err: any) {
    console.error('[Bootstrap] Error al verificar administrador:', err.message);
  }
}
