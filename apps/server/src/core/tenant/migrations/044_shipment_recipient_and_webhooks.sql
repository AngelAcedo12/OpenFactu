-- Datos del destinatario del envío (modo logística standalone sin SDN)
-- y tabla de suscripciones a webhooks salientes para integrarse con sistemas
-- externos.

-- ── Destinatario directo en el shipment ─────────────────────────────────
ALTER TABLE "{{schema}}"."Shipment" ADD COLUMN IF NOT EXISTS "recipientName"  TEXT;
ALTER TABLE "{{schema}}"."Shipment" ADD COLUMN IF NOT EXISTS "recipientEmail" TEXT;
ALTER TABLE "{{schema}}"."Shipment" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;

-- Flag del tenant: en `false` la app oculta contabilidad/ventas/etc. y sólo
-- muestra logística. Se gestiona vía systemConfigs.

-- ── Webhooks salientes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."WebhookSubscription" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "url"        TEXT NOT NULL,
  "events"     TEXT[] NOT NULL DEFAULT '{}',  -- p.ej. {shipment.delivered, shipment.cancelled}
  "secret"     TEXT,                           -- opcional, para firma HMAC
  "isActive"   BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "WebhookSubscription_active_idx"
  ON "{{schema}}"."WebhookSubscription" ("isActive");
