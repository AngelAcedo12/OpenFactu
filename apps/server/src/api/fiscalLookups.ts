import { Router } from 'express';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { logAudit } from '../utils/audit';
import { newId } from '../core/documents/paymentStatusRecalc';

/**
 * Routers para los catálogos auxiliares de facturación:
 *  - GET/POST/PUT/DELETE /api/currencies
 *  - GET/POST/PUT/DELETE /api/document-types
 *  - GET/POST/PUT/DELETE /api/payment-methods
 *  - GET/POST/PUT/DELETE /api/payment-terms
 *
 * Son CRUD mínimos porque el flujo normal es: seed al crear tenant +
 * plugins fiscales añaden sus propios tipos. La UI sólo necesita GET.
 */

export const currenciesRouter = makeCrud(schema.currencies, 'Currency');
export const documentTypesRouter = makeCrud(schema.documentTypes, 'DocumentType');
export const paymentMethodsRouter = makeCrud(schema.paymentMethods, 'PaymentMethod');
export const paymentTermsRouter = makeCrud(schema.paymentTerms, 'PaymentTerm');

function makeCrud(table: any, entityName: string): Router {
  const router = Router();

  router.get('/', async (req: any, res) => {
    try {
      const rows = await req.tenantClient.select().from(table);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', async (req: any, res) => {
    try {
      const id = newId();
      await req.tenantClient.insert(table).values({ id, ...req.body });
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: entityName,
        entityId: id,
        action: 'CREATE',
        newValue: req.body,
      });
      res.json({ id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/:id', async (req: any, res) => {
    try {
      // Drizzle espera Date para columnas timestamp, pero el body los trae como
      // string (createdAt, updatedAt). Los quitamos del set para que el motor
      // no los toque — son inmutables o se actualizan solos vía defaultNow().
      const { id, createdAt, updatedAt, ...patch } = req.body || {};
      await req.tenantClient.update(table).set(patch).where(eq(table.id, req.params.id));
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: entityName,
        entityId: req.params.id,
        action: 'UPDATE',
        newValue: req.body,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', async (req: any, res) => {
    try {
      await req.tenantClient.delete(table).where(eq(table.id, req.params.id));
      logAudit({
        tenantClient: req.tenantClient,
        tenantId: req.tenantId || '',
        userId: req.user?.id,
        entityType: entityName,
        entityId: req.params.id,
        action: 'DELETE',
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
