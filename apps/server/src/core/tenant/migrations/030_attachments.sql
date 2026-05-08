-- Tabla de adjuntos genérica del tenant. Una fila por archivo subido,
-- vinculada a una entidad por (entityType, entityId). El backend físico (local,
-- gdrive, onedrive) se decide por tenant via systemConfigs `storage.provider`,
-- pero la columna `provider` aquí recuerda cuál se usó al subir cada archivo
-- para que un cambio de proveedor no rompa la descarga de los antiguos.

CREATE TABLE IF NOT EXISTS "{{schema}}"."Attachment" (
  "id"           TEXT PRIMARY KEY,
  "entityType"   TEXT NOT NULL,
  "entityId"     TEXT NOT NULL,
  "fileName"     TEXT NOT NULL,
  "mime"         TEXT NOT NULL,
  "size"         BIGINT NOT NULL,
  "provider"     TEXT NOT NULL,
  "externalId"   TEXT NOT NULL,
  "uploadedBy"   TEXT,
  "uploadedAt"   TIMESTAMP DEFAULT now() NOT NULL,
  "deletedAt"    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Attachment_entity_idx"
  ON "{{schema}}"."Attachment" ("entityType", "entityId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Attachment_uploaded_idx"
  ON "{{schema}}"."Attachment" ("uploadedAt" DESC);
