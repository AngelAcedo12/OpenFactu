import { Router } from 'express';
import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthService } from '../core/auth/AuthService';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/users
 */
router.get('/', async (req: any, res) => {
  try {
    const db = ClientFactory.getClient('public');
    const users = await db.select({
      id: schema.globalUsers.id,
      email: schema.globalUsers.email,
      username: schema.globalUsers.username,
      role: schema.globalUsers.role,
      tenantId: schema.globalUsers.tenantId
    }).from(schema.globalUsers);
    
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 */
router.post('/', async (req: any, res) => {
  try {
    const db = ClientFactory.getClient('public');
    const { password, ...userData } = req.body;
    
    const hashedPassword = await AuthService.hashPassword(password);
    
    const [user] = await db.insert(schema.globalUsers)
      .values({
        ...userData,
        id: crypto.randomUUID(),
        password: hashedPassword
      })
      .returning();
      
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const db = ClientFactory.getClient('public');
    const { password, ...userData } = req.body;
    
    const updateData: any = { 
      ...userData,
      updatedAt: new Date()
    };

    if (password) {
      updateData.password = await AuthService.hashPassword(password);
    }
    
    const [user] = await db.update(schema.globalUsers)
      .set(updateData)
      .where(eq(schema.globalUsers.id, id))
      .returning();
      
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const db = ClientFactory.getClient('public');
    await db.delete(schema.globalUsers)
      .where(eq(schema.globalUsers.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
