import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/partners
 * Lista todos los socios de negocio del tenant.
 */
router.get('/', async (req: any, res) => {
  try {
    const addresses = await req.tenantClient.select().from(schema.partnerAddresses);
    const partners = await req.tenantClient.select()
      .from(schema.businessPartners)
      .orderBy(asc(schema.businessPartners.name));
      
    // Anidar direcciones
    const result = partners.map((p: any) => ({
       ...p,
       addresses: addresses.filter((a: any) => a.partnerId === p.id)
    }));
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/partners
 * Crea un nuevo socio de negocio.
 */
router.post('/', async (req: any, res) => {
  try {
    const { groupId, code, addresses, ...restBody } = req.body;
    let finalCode = code;

    // Autogeneración usando el prefijo del grupo
    if (groupId) {
      const { like } = await import('drizzle-orm');
      const [group] = await req.tenantClient.select()
        .from(schema.partnerGroups)
        .where(eq(schema.partnerGroups.id, groupId));

      if (group && group.codePrefix) {
        const prefix = group.codePrefix;
        const existingPartners = await req.tenantClient.select({ code: schema.businessPartners.code })
          .from(schema.businessPartners)
          .where(like(schema.businessPartners.code, `${prefix}-%`));

        let maxSeq = 0;
        for (const p of existingPartners) {
          const parts = p.code.split('-');
          if (parts.length > 1) {
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }
        finalCode = `${prefix}-${String(maxSeq + 1).padStart(5, '0')}`;
      }
    }

    const id = crypto.randomUUID();
    const [partner] = await req.tenantClient.insert(schema.businessPartners)
      .values({
        ...restBody,
        code: finalCode,
        groupId,
        id
      })
      .returning();
      
    if (addresses && addresses.length > 0) {
      const inserts = addresses.map((a: any) => ({ ...a, id: crypto.randomUUID(), partnerId: id }));
      await req.tenantClient.insert(schema.partnerAddresses).values(inserts);
      partner.addresses = inserts;
    } else {
      partner.addresses = [];
    }
    
    res.json(partner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/partners/:id
 */
router.patch('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    const { addresses, ...restBody } = req.body;
    
    const [partner] = await req.tenantClient.update(schema.businessPartners)
      .set(restBody)
      .where(eq(schema.businessPartners.id, id))
      .returning();
      
    // Si mandamos addresses, reemplazamos todas las del socio (Simple update)
    if (addresses) {
      await req.tenantClient.delete(schema.partnerAddresses).where(eq(schema.partnerAddresses.partnerId, id));
      if (addresses.length > 0) {
        const inserts = addresses.map((a: any) => ({ 
           ...a, 
           id: a.id || crypto.randomUUID(), 
           partnerId: id 
        }));
        await req.tenantClient.insert(schema.partnerAddresses).values(inserts);
        partner.addresses = inserts;
      } else {
        partner.addresses = [];
      }
    }
    
    res.json(partner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/partners/:id
 */
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  try {
    await req.tenantClient.delete(schema.businessPartners)
      .where(eq(schema.businessPartners.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
