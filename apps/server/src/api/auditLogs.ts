import { Router } from 'express';
import * as schema from '../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/audit-logs
 * Query params: entityType, action, dateFrom, dateTo, page, limit
 */
router.get('/', async (req: any, res) => {
  const { entityType, action, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (req.tenantId) conditions.push(eq(schema.auditLogs.tenantId, req.tenantId));
  if (entityType) conditions.push(eq(schema.auditLogs.entityType, entityType as string));
  if (action) conditions.push(eq(schema.auditLogs.action, action as string));
  if (dateFrom) conditions.push(gte(schema.auditLogs.createdAt, new Date(dateFrom as string)));
  if (dateTo) {
    const end = new Date(dateTo as string);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(schema.auditLogs.createdAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [logs, countResult] = await Promise.all([
      req.tenantClient
        .select()
        .from(schema.auditLogs)
        .where(whereClause)
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(limitNum)
        .offset(offset),
      req.tenantClient
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.auditLogs)
        .where(whereClause),
    ]);

    res.json({
      data: logs,
      total: countResult[0]?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
