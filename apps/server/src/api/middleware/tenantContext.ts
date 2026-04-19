import { Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { ClientFactory } from '../../core/tenant/ClientFactory';
import { AuthService } from '../../core/auth/AuthService';
import * as schema from '../../db/schema';

/**
 * Middleware para identificar el tenant activo y el usuario autenticado.
 * Inyecta en req:
 *  - req.tenantClient: cliente Drizzle del tenant activo
 *  - req.tenantId:     id del tenant
 *  - req.tenantSchema: nombre del schema físico del tenant (ej. tenant_acme)
 *  - req.user:         { id, role, email, username, tenantId } — si el token es válido
 */
export const tenantContextMiddleware = async (req: any, res: Response, next: NextFunction) => {
  let tenantId = req.headers['x-tenant-id'] as string;

  // Resolver usuario y tenant desde el JWT
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const payload: any = AuthService.verifyToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          role: payload.role,
          email: payload.email,
          username: payload.username,
          tenantId: payload.tenantId,
        };
        if (!tenantId && payload.tenantId) {
          tenantId = payload.tenantId;
        }
      }
    } catch (e) {
      /* token inválido, seguimos sin req.user */
    }
  }

  try {
    if (!tenantId) {
      req.tenantClient = ClientFactory.getClient('public');
    } else {
      req.tenantClient = await ClientFactory.getTenantClient(tenantId);
      // Resolver schemaName a partir del id — necesario para el StorageResolver
      // y otros módulos que escriben en `storage/uploads/<schema>/...`.
      try {
        const publicDb = ClientFactory.getClient('public');
        const [t] = await publicDb
          .select({ schemaName: schema.tenants.schemaName })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, tenantId));
        if (t?.schemaName) req.tenantSchema = t.schemaName;
      } catch {
        /* opcional, los endpoints que lo necesiten validan presencia */
      }
    }
    req.tenantId = tenantId;
    next();
  } catch (error: any) {
    console.error('[TenantMiddleware] Error:', error.message);
    req.tenantClient = ClientFactory.getClient('public');
    next();
  }
};
