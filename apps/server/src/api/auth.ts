import { Router } from 'express';
import { AuthService } from '../core/auth/AuthService';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { eq, or } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/auth/tenants
 */
router.get('/tenants', async (req, res) => {
  try {
    const db = ClientFactory.getClient('public');
    const results = await db.select({
      id: schema.tenants.id,
      name: schema.tenants.name
    }).from(schema.tenants);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener empresas' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password, selectedTenantId } = req.body; 

  try {
    const db = ClientFactory.getClient('public');
    
    // Buscar usuario por email o username
    const [user] = await db.select()
      .from(schema.globalUsers)
      .where(or(
        eq(schema.globalUsers.email, email),
        eq(schema.globalUsers.username, email)
      ));

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await AuthService.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const finalTenantId = (user.role === 'SUPERUSER' || user.role === 'ADMIN') && selectedTenantId 
      ? selectedTenantId 
      : user.tenantId;

    let tenantName = null;
    if (finalTenantId) {
      const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, finalTenantId));
      tenantName = t?.name;
    }

    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantId: finalTenantId
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: finalTenantId,
        tenantName: tenantName
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  try {
    const token = authHeader.split(' ')[1];
    const payload: any = AuthService.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token inválido' });

    const db = ClientFactory.getClient('public');
    const [user] = await db.select().from(schema.globalUsers).where(eq(schema.globalUsers.id, payload.userId));

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let tenantName = null;
    const finalTenantId = payload.tenantId || user.tenantId;
    if (finalTenantId) {
      const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, finalTenantId));
      tenantName = t?.name;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantId: finalTenantId,
      tenantName: tenantName
    });
  } catch (e) {
    res.status(401).json({ error: 'No autorizado' });
  }
});

export default router;
