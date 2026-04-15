import { Router } from 'express';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../utils/audit';

const router = Router();

/**
 * GET /api/memberships/tenants-for-user?email=X
 * Devuelve los tenants accesibles para un usuario (por email o username).
 * Sin autenticación — se usa en el login para poblar el selector de empresa.
 */
router.get('/tenants-for-user', async (req: any, res) => {
  const { email } = req.query;
  if (!email) return res.json([]);

  try {
    const db = ClientFactory.getClient('public');

    const [user] = await db
      .select()
      .from(schema.globalUsers)
      .where(or(
        eq(schema.globalUsers.email, email as string),
        eq(schema.globalUsers.username, email as string)
      ));

    if (!user) return res.json([]);

    // SUPERUSER accede a todos los tenants
    if (user.role === 'SUPERUSER') {
      const all = await db
        .select({ id: schema.tenants.id, name: schema.tenants.name })
        .from(schema.tenants);
      return res.json(all);
    }

    // Buscar memberships
    const memberships = await db
      .select({ id: schema.tenants.id, name: schema.tenants.name })
      .from(schema.userTenantMemberships)
      .innerJoin(schema.tenants, eq(schema.userTenantMemberships.tenantId, schema.tenants.id))
      .where(eq(schema.userTenantMemberships.userId, user.id));

    if (memberships.length > 0) return res.json(memberships);

    // Fallback legacy: GlobalUser.tenantId
    if (user.tenantId) {
      const [t] = await db
        .select({ id: schema.tenants.id, name: schema.tenants.name })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, user.tenantId));
      return res.json(t ? [t] : []);
    }

    return res.json([]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/memberships?userId=:id
 * Devuelve todas las memberships de un usuario con tenantName.
 */
router.get('/', async (req: any, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  try {
    const db = ClientFactory.getClient('public');
    const results = await db
      .select({
        id: schema.userTenantMemberships.id,
        userId: schema.userTenantMemberships.userId,
        tenantId: schema.userTenantMemberships.tenantId,
        tenantName: schema.tenants.name,
        role: schema.userTenantMemberships.role,
        permissions: schema.userTenantMemberships.permissions,
        createdAt: schema.userTenantMemberships.createdAt,
        updatedAt: schema.userTenantMemberships.updatedAt,
      })
      .from(schema.userTenantMemberships)
      .innerJoin(schema.tenants, eq(schema.userTenantMemberships.tenantId, schema.tenants.id))
      .where(eq(schema.userTenantMemberships.userId, userId as string));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/memberships
 * Crea una nueva membership: { userId, tenantId, role, permissions }
 */
router.post('/', async (req: any, res) => {
  const { userId, tenantId, role = 'USER', permissions } = req.body;
  if (!userId || !tenantId) return res.status(400).json({ error: 'userId y tenantId son obligatorios' });
  if (role === 'SUPERUSER') return res.status(400).json({ error: 'SUPERUSER no puede asignarse como rol de membership' });

  try {
    const db = ClientFactory.getClient('public');
    const id = crypto.randomUUID();
    const [membership] = await db
      .insert(schema.userTenantMemberships)
      .values({ id, userId, tenantId, role, permissions: permissions || null, updatedAt: new Date() })
      .returning();
    res.json(membership);
    logAudit({
      tenantClient: await ClientFactory.getTenantClient(tenantId),
      tenantId,
      userId: req.user?.id,
      entityType: 'UserTenantMembership',
      entityId: id,
      action: 'CREATE',
      newValue: { userId, tenantId, role },
    });
  } catch (error: any) {
    if (error.message?.includes('unique')) {
      return res.status(409).json({ error: 'Este usuario ya tiene acceso a esta empresa' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/memberships/:id
 * Actualiza role y/o permissions de una membership.
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  const { role, permissions } = req.body;
  if (role === 'SUPERUSER') return res.status(400).json({ error: 'SUPERUSER no puede asignarse como rol de membership' });

  try {
    const db = ClientFactory.getClient('public');
    const [old] = await db.select().from(schema.userTenantMemberships).where(eq(schema.userTenantMemberships.id, id));
    const updateData: any = { updatedAt: new Date() };
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    const [membership] = await db
      .update(schema.userTenantMemberships)
      .set(updateData)
      .where(eq(schema.userTenantMemberships.id, id))
      .returning();

    if (!membership) return res.status(404).json({ error: 'Membership no encontrada' });
    res.json(membership);
    if (old) logAudit({
      tenantClient: await ClientFactory.getTenantClient(membership.tenantId),
      tenantId: membership.tenantId,
      userId: req.user?.id,
      entityType: 'UserTenantMembership',
      entityId: id,
      action: 'UPDATE',
      oldValue: { role: old.role, permissions: old.permissions },
      newValue: { role: membership.role, permissions: membership.permissions },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/memberships/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const db = ClientFactory.getClient('public');
    const [old] = await db.select().from(schema.userTenantMemberships).where(eq(schema.userTenantMemberships.id, id));
    await db
      .delete(schema.userTenantMemberships)
      .where(eq(schema.userTenantMemberships.id, id));
    res.json({ success: true });
    if (old) logAudit({
      tenantClient: await ClientFactory.getTenantClient(old.tenantId),
      tenantId: old.tenantId,
      userId: req.user?.id,
      entityType: 'UserTenantMembership',
      entityId: id,
      action: 'DELETE',
      oldValue: old,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
