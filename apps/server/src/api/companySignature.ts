/**
 * Gestión de la imagen de firma de la empresa. Guarda el PNG/JPG como
 * fichero en el storage del tenant (mismo patrón que los attachments) y
 * referencia el id del attachment en el config key `company_signature_image_url`.
 *
 * Endpoints:
 *   POST   /api/company/signature        → multipart "file", reemplaza la firma anterior
 *   GET    /api/company/signature        → stream de la imagen (requiere auth del middleware)
 *   DELETE /api/company/signature        → elimina la firma
 *
 * El PDF builder hace fetch → data URI antes de renderizar para que Puppeteer
 * no necesite re-autenticar (ver PdfPayloadBuilder.ts).
 */
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import { and, eq, isNull, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { StorageResolver } from '../core/storage/StorageResolver';
import type { StorageProviderId } from '../core/storage/StorageAdapter';
import { logAudit } from '../utils/audit';

const router = Router();
const upload = multer({
  dest: '/tmp/openfactu-signature/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

function getTenantSchema(req: any): string | null {
  return req.tenantSchema || req.tenant?.schemaName || null;
}

const ENTITY_TYPE = 'CompanySignature';
const ENTITY_ID = 'signature'; // Uno por tenant — se sobreescribe al subir una nueva.

/**
 * Busca el attachment activo de la firma (el más reciente no borrado).
 */
async function findCurrent(tenantClient: any) {
  const rows = await tenantClient
    .select()
    .from(schema.attachments)
    .where(
      and(
        eq(schema.attachments.entityType, ENTITY_TYPE),
        eq(schema.attachments.entityId, ENTITY_ID),
        isNull(schema.attachments.deletedAt),
      ),
    )
    .orderBy(desc(schema.attachments.uploadedAt))
    .limit(1);
  return rows[0] || null;
}

/**
 * POST /api/company/signature — sube nueva firma (reemplaza la anterior).
 */
router.post('/', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'falta el archivo (campo "file")' });
    const mime = req.file.mimetype;
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ error: 'solo se admiten imágenes (PNG / JPG)' });
    }

    const tenantSchema = getTenantSchema(req);
    if (!tenantSchema) return res.status(400).json({ error: 'tenant requerido' });

    // Marca la firma anterior como borrada (soft delete en DB + borrado físico).
    const prev = await findCurrent(req.tenantClient);
    if (prev) {
      try {
        const prevAdapter = await StorageResolver.forProvider(
          prev.provider as StorageProviderId,
          req.tenantClient,
          tenantSchema,
        );
        await prevAdapter.remove({ tenantSchema, externalId: prev.externalId });
      } catch {
        /* best effort */
      }
      await req.tenantClient
        .update(schema.attachments)
        .set({ deletedAt: new Date() })
        .where(eq(schema.attachments.id, prev.id));
    }

    // Sube el nuevo fichero.
    const adapter = await StorageResolver.forTenant(req.tenantClient, tenantSchema);
    const content = await fs.promises.readFile(req.file.path);
    const ref = await adapter.upload({
      tenantSchema,
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      fileName: req.file.originalname,
      mime,
      content,
    });
    fs.promises.unlink(req.file.path).catch(() => {});

    const id = crypto.randomUUID();
    await req.tenantClient.insert(schema.attachments).values({
      id,
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      fileName: req.file.originalname,
      mime,
      size: req.file.size,
      provider: adapter.id,
      externalId: ref.externalId,
      uploadedBy: req.user?.id ?? null,
    });

    // Referencia en config para que el PDF/UI sepa que hay firma disponible.
    // Guardamos la URL del endpoint dedicado (se sirve con auth).
    const url = `/api/company/signature?v=${Date.now()}`;
    await upsertSignatureUrl(req.tenantClient, url);

    res.json({ url, fileName: req.file.originalname, mime, size: req.file.size });

    logAudit({
      tenantClient: req.tenantClient,
      tenantId: req.tenantId || '',
      userId: req.user?.id,
      entityType: 'CompanySignature',
      entityId: id,
      action: 'CREATE',
      newValue: { fileName: req.file.originalname, mime, size: req.file.size },
    });
  } catch (e: any) {
    console.error('[CompanySignature.upload] error:', e?.stack || e);
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: e?.message || 'Error al subir firma' });
  }
});

/**
 * GET /api/company/signature — stream de la imagen.
 */
router.get('/', async (req: any, res) => {
  try {
    const tenantSchema = getTenantSchema(req);
    if (!tenantSchema) return res.status(400).json({ error: 'tenant requerido' });

    const row = await findCurrent(req.tenantClient);
    if (!row) return res.status(404).json({ error: 'Sin firma' });

    const adapter = await StorageResolver.forProvider(
      row.provider as StorageProviderId,
      req.tenantClient,
      tenantSchema,
    );
    const dl = await adapter.download({ tenantSchema, externalId: row.externalId });
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'private, max-age=60');
    dl.stream.pipe(res);
  } catch (e: any) {
    console.error('[CompanySignature.get] error:', e?.message);
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

/**
 * DELETE /api/company/signature — borra firma actual.
 */
router.delete('/', async (req: any, res) => {
  try {
    const tenantSchema = getTenantSchema(req);
    if (!tenantSchema) return res.status(400).json({ error: 'tenant requerido' });

    const row = await findCurrent(req.tenantClient);
    if (row) {
      try {
        const adapter = await StorageResolver.forProvider(
          row.provider as StorageProviderId,
          req.tenantClient,
          tenantSchema,
        );
        await adapter.remove({ tenantSchema, externalId: row.externalId });
      } catch {
        /* best effort */
      }
      await req.tenantClient
        .update(schema.attachments)
        .set({ deletedAt: new Date() })
        .where(eq(schema.attachments.id, row.id));
    }
    await upsertSignatureUrl(req.tenantClient, '');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

/**
 * Upsert directo en `SystemConfig` con la URL de la firma. No usamos
 * setCompanyConfig porque ese helper sobreescribe todos los campos; aquí
 * solo queremos tocar la clave `company_signature_image_url`.
 */
async function upsertSignatureUrl(tenantClient: any, url: string) {
  const key = 'company_signature_image_url';
  const [existing] = await tenantClient
    .select()
    .from(schema.systemConfigs)
    .where(eq(schema.systemConfigs.key, key));
  if (existing) {
    await tenantClient
      .update(schema.systemConfigs)
      .set({ value: url, updatedAt: new Date() })
      .where(eq(schema.systemConfigs.key, key));
  } else {
    await tenantClient.insert(schema.systemConfigs).values({
      id: crypto.randomUUID(),
      key,
      value: url,
      description: 'URL del endpoint que sirve la imagen de firma',
    });
  }
}

export default router;
