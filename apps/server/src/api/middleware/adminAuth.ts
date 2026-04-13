import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../core/auth/AuthService';


/**
 * Middleware para asegurar que el usuario esté autenticado y sea ADMIN.
 */
export const adminMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  const token = authHeader.split(' ')[1];
  const payload: any = AuthService.verifyToken(token);

  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPERUSER')) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador o súper usuario' });
  }

  req.user = payload;
  next();
};
