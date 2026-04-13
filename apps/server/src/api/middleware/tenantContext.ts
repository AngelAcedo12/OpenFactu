import { Request, Response, NextFunction } from 'express';
import { ClientFactory } from '../../core/tenant/ClientFactory';
import { AuthService } from '../../core/auth/AuthService';

/**
 * Middleware para identificar el tenant activo y configurar Drizzle.
 */
export const tenantContextMiddleware = async (req: any, res: Response, next: NextFunction) => {
  let tenantId = req.headers['x-tenant-id'] as string;
  
  // Si no viene en header, intentar sacarlo del token
  const authHeader = req.headers.authorization;
  if (!tenantId && authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const payload: any = AuthService.verifyToken(token);
      if (payload?.tenantId) {
        tenantId = payload.tenantId;
      }
    } catch (e) { /* ignore auth errors here, let other middleware handle it */ }
  }

  try {
    if (!tenantId) {
      req.tenantClient = ClientFactory.getClient('public');
    } else {
      req.tenantClient = await ClientFactory.getTenantClient(tenantId);
    }
    req.tenantId = tenantId;
    next();
  } catch (error: any) {
    console.error('[TenantMiddleware] Error:', error.message);
    // Fallback por seguridad
    req.tenantClient = ClientFactory.getClient('public');
    next();
  }
};
