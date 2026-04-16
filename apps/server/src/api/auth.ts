import { Router } from 'express';
import { AuthService } from '../core/auth/AuthService';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { eq, or, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/auth/tenants
 */
router.get('/tenants', async (req, res) => {
  try {
    const db = ClientFactory.getClient('public');
    const results = await db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
      })
      .from(schema.tenants);
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
    const [user] = await db
      .select()
      .from(schema.globalUsers)
      .where(or(eq(schema.globalUsers.email, email), eq(schema.globalUsers.username, email)));

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await AuthService.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Resolución de tenant/rol/permisos en 3 niveles
    let finalRole = user.role;
    let finalTenantId: string | null = null;
    let finalPermissions: string | null = null;

    if (user.role === 'SUPERUSER') {
      // SUPERUSER bypassa memberships: accede a cualquier tenant
      finalTenantId = selectedTenantId || null;
    } else {
      // Nivel 1: buscar membership exacta para el tenant seleccionado
      if (selectedTenantId) {
        const [membership] = await db
          .select()
          .from(schema.userTenantMemberships)
          .where(
            and(
              eq(schema.userTenantMemberships.userId, user.id),
              eq(schema.userTenantMemberships.tenantId, selectedTenantId),
            ),
          );

        if (membership) {
          finalTenantId = membership.tenantId;
          finalRole = membership.role;
          finalPermissions = membership.permissions;
        } else if (user.tenantId === selectedTenantId) {
          // Nivel 2: fallback legacy — el usuario tiene ese tenant asignado directamente
          finalTenantId = user.tenantId;
          finalPermissions = user.permissions;
        } else {
          return res.status(403).json({ error: 'No tienes acceso a esta empresa' });
        }
      } else {
        // Sin selectedTenantId: usar tenantId legacy
        finalTenantId = user.tenantId;
        finalPermissions = user.permissions;
      }
    }

    let tenantName = null;
    if (finalTenantId) {
      const [t] = await db
        .select()
        .from(schema.tenants)
        .where(eq(schema.tenants.id, finalTenantId));
      tenantName = t?.name;
    }

    // ADMIN y SUPERUSER ignoran siempre permissions granulares — tienen acceso total
    const effectivePermissions =
      finalRole === 'SUPERUSER' || finalRole === 'ADMIN'
        ? null
        : finalPermissions
          ? JSON.parse(finalPermissions)
          : null;

    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: finalRole,
      tenantId: finalTenantId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: finalRole,
        tenantId: finalTenantId,
        tenantName,
        permissions: effectivePermissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/switch-tenant
 * Cambia el tenant activo del usuario autenticado y devuelve un JWT nuevo.
 */
router.post('/switch-tenant', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  try {
    const token = authHeader.split(' ')[1];
    const payload: any = AuthService.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token inválido' });

    const { tenantId } = req.body || {};
    if (!tenantId) return res.status(400).json({ error: 'tenantId es obligatorio' });

    const db = ClientFactory.getClient('public');
    const [user] = await db
      .select()
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.id, payload.userId));
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let finalRole = user.role;
    let finalPermissions: string | null = null;

    if (user.role === 'SUPERUSER') {
      // libre acceso a cualquier tenant
    } else {
      const [membership] = await db
        .select()
        .from(schema.userTenantMemberships)
        .where(
          and(
            eq(schema.userTenantMemberships.userId, user.id),
            eq(schema.userTenantMemberships.tenantId, tenantId),
          ),
        );

      if (membership) {
        finalRole = membership.role;
        finalPermissions = membership.permissions;
      } else if (user.tenantId === tenantId) {
        finalPermissions = user.permissions;
      } else {
        return res.status(403).json({ error: 'No tienes acceso a esta empresa' });
      }
    }

    const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
    if (!t) return res.status(404).json({ error: 'Empresa no encontrada' });

    const newToken = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: finalRole,
      tenantId,
    });

    // ADMIN y SUPERUSER ignoran siempre permissions granulares
    const effectivePermissions =
      finalRole === 'SUPERUSER' || finalRole === 'ADMIN'
        ? null
        : finalPermissions
          ? JSON.parse(finalPermissions)
          : null;

    res.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: finalRole,
        tenantId,
        tenantName: t.name,
        permissions: effectivePermissions,
      },
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
    const [user] = await db
      .select()
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.id, payload.userId));

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const activeTenantId = payload.tenantId || user.tenantId;
    let resolvedRole = payload.role || user.role;
    let resolvedPermissions: any = null;

    if (user.role !== 'SUPERUSER' && activeTenantId) {
      // Buscar membership activa
      const [membership] = await db
        .select()
        .from(schema.userTenantMemberships)
        .where(
          and(
            eq(schema.userTenantMemberships.userId, user.id),
            eq(schema.userTenantMemberships.tenantId, activeTenantId),
          ),
        );

      if (membership) {
        resolvedRole = membership.role;
        resolvedPermissions = membership.permissions ? JSON.parse(membership.permissions) : null;
      } else {
        // Fallback legacy
        resolvedPermissions = user.permissions ? JSON.parse(user.permissions) : null;
      }
    }

    let tenantName = null;
    if (activeTenantId) {
      const [t] = await db
        .select()
        .from(schema.tenants)
        .where(eq(schema.tenants.id, activeTenantId));
      tenantName = t?.name;
    }

    // ADMIN y SUPERUSER ignoran siempre permissions granulares
    const effectivePermissions =
      resolvedRole === 'SUPERUSER' || resolvedRole === 'ADMIN' ? null : resolvedPermissions;

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: resolvedRole,
      tenantId: activeTenantId,
      tenantName,
      permissions: effectivePermissions,
    });
  } catch (e) {
    res.status(401).json({ error: 'No autorizado' });
  }
});

export default router;
