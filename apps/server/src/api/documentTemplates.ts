import { Router } from 'express';
import crypto from 'crypto';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { PdfRenderer, ALL_DOC_TYPES, extractMetaFromHtml, type DocType } from '@openfactu/pdf';
import { PdfPayloadBuilder } from '../core/documents/PdfPayloadBuilder';
import { logAudit } from '../utils/audit';

const router = Router();

const isValidDocType = (t: any): t is DocType => ALL_DOC_TYPES.includes(t);

// GET / — lista (opcional filtro por ?docType=SINV)
router.get('/', async (req: any, res) => {
  try {
    const { docType } = req.query;
    const where = docType ? eq(schema.documentTemplates.docType, String(docType)) : undefined;
    const query = req.tenantClient
      .select({
        id: schema.documentTemplates.id,
        docType: schema.documentTemplates.docType,
        name: schema.documentTemplates.name,
        isDefault: schema.documentTemplates.isDefault,
        updatedAt: schema.documentTemplates.updatedAt,
      })
      .from(schema.documentTemplates);
    const rows = where
      ? await query
          .where(where)
          .orderBy(asc(schema.documentTemplates.docType), asc(schema.documentTemplates.name))
      : await query.orderBy(
          asc(schema.documentTemplates.docType),
          asc(schema.documentTemplates.name),
        );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /:id — detalle (incluye html)
router.get('/:id', async (req: any, res) => {
  try {
    const [row] = await req.tenantClient
      .select()
      .from(schema.documentTemplates)
      .where(eq(schema.documentTemplates.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'No encontrada' });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST / — crear
router.post('/', async (req: any, res) => {
  try {
    const { docType, name, html, isDefault } = req.body;
    if (!isValidDocType(docType)) return res.status(400).json({ error: 'docType inválido' });
    if (!name || !html) return res.status(400).json({ error: 'name y html son obligatorios' });

    const id = crypto.randomUUID();
    await req.tenantClient.transaction(async (tx: any) => {
      if (isDefault) {
        await tx
          .update(schema.documentTemplates)
          .set({ isDefault: false })
          .where(eq(schema.documentTemplates.docType, docType));
      }
      await tx.insert(schema.documentTemplates).values({
        id,
        docType,
        name,
        html,
        isDefault: !!isDefault,
      });
    });
    PdfRenderer.invalidateCache();
    res.json({ id });
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'DocumentTemplate',
      entityId: id,
      action: 'CREATE',
      newValue: { docType, name, isDefault: !!isDefault },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id — actualizar
router.put('/:id', async (req: any, res) => {
  try {
    const { name, html, isDefault, canvasLayout, legacyHtml } = req.body;
    await req.tenantClient.transaction(async (tx: any) => {
      const [existing] = await tx
        .select()
        .from(schema.documentTemplates)
        .where(eq(schema.documentTemplates.id, req.params.id));
      if (!existing) throw new Error('No encontrada');

      if (isDefault && !existing.isDefault) {
        await tx
          .update(schema.documentTemplates)
          .set({ isDefault: false })
          .where(eq(schema.documentTemplates.docType, existing.docType));
      }

      const updates: any = { updatedAt: new Date() };
      if (typeof name === 'string') updates.name = name;
      if (typeof html === 'string') updates.html = html;
      if (typeof isDefault === 'boolean') updates.isDefault = isDefault;
      if (canvasLayout !== undefined) updates.canvasLayout = canvasLayout;
      if (typeof legacyHtml === 'boolean') updates.legacyHtml = legacyHtml;

      await tx
        .update(schema.documentTemplates)
        .set(updates)
        .where(eq(schema.documentTemplates.id, req.params.id));
    });
    PdfRenderer.invalidateCache();
    res.json({ ok: true });
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'DocumentTemplate',
      entityId: req.params.id,
      action: 'UPDATE',
      newValue: req.body,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /:id/set-default
router.post('/:id/set-default', async (req: any, res) => {
  try {
    await req.tenantClient.transaction(async (tx: any) => {
      const [existing] = await tx
        .select()
        .from(schema.documentTemplates)
        .where(eq(schema.documentTemplates.id, req.params.id));
      if (!existing) throw new Error('No encontrada');
      await tx
        .update(schema.documentTemplates)
        .set({ isDefault: false })
        .where(eq(schema.documentTemplates.docType, existing.docType));
      await tx
        .update(schema.documentTemplates)
        .set({ isDefault: true })
        .where(eq(schema.documentTemplates.id, req.params.id));
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: any, res) => {
  try {
    await req.tenantClient.transaction(async (tx: any) => {
      const [existing] = await tx
        .select()
        .from(schema.documentTemplates)
        .where(eq(schema.documentTemplates.id, req.params.id));
      if (!existing) return;
      await tx
        .delete(schema.documentTemplates)
        .where(eq(schema.documentTemplates.id, req.params.id));
      // Si era default, promover el primer restante del mismo docType
      if (existing.isDefault) {
        const [next] = await tx
          .select()
          .from(schema.documentTemplates)
          .where(eq(schema.documentTemplates.docType, existing.docType))
          .limit(1);
        if (next) {
          await tx
            .update(schema.documentTemplates)
            .set({ isDefault: true })
            .where(eq(schema.documentTemplates.id, next.id));
        }
      }
    });
    PdfRenderer.invalidateCache();
    res.json({ ok: true });
    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'DocumentTemplate',
      entityId: req.params.id,
      action: 'DELETE',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /preview — renderiza un PDF sin persistir
router.post('/preview', async (req: any, res) => {
  try {
    const { html, docType, sampleDocId } = req.body;
    if (!html) return res.status(400).json({ error: 'html es obligatorio' });
    if (!isValidDocType(docType)) return res.status(400).json({ error: 'docType inválido' });

    let payload;
    if (sampleDocId) {
      try {
        payload = await PdfPayloadBuilder.build(docType, sampleDocId, req.tenantClient);
      } catch {
        payload = PdfPayloadBuilder.fixture(docType);
      }
    } else {
      // Intentar auto-sample
      const latestId = await PdfPayloadBuilder.findLatestSampleId(docType, req.tenantClient);
      payload = latestId
        ? await PdfPayloadBuilder.build(docType, latestId, req.tenantClient).catch(() =>
            PdfPayloadBuilder.fixture(docType),
          )
        : PdfPayloadBuilder.fixture(docType);
    }

    const meta = extractMetaFromHtml(html);
    const renderOptions = meta ? PdfRenderer.renderOptionsFromVisual(meta) : {};
    const buffer = await PdfRenderer.render(html, payload, renderOptions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.end(buffer);
  } catch (e: any) {
    console.error('[DocumentTemplates] preview error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
