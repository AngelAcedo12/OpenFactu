-- Notificaciones in-app por tenant.
--
-- Un row == una notificación para UN usuario del tenant. Si el mismo evento
-- afecta a varios usuarios, se insertan N filas (una por destinatario) — así
-- el "read" es per-user sin mezclar estados.
--
-- `level` es semántico (info/warn/error/success) — lo usa el front para
-- elegir icono y color. `link` es un path relativo opcional (/sales/invoices
-- por ejemplo) al que navegar al hacer click.

CREATE TABLE IF NOT EXISTS "{{schema}}"."Notification" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT,
  "level"      TEXT NOT NULL DEFAULT 'info',  -- info | warn | error | success
  "link"       TEXT,
  "readAt"     TIMESTAMP,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Notification_user_unread_idx"
  ON "{{schema}}"."Notification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Notification_user_idx"
  ON "{{schema}}"."Notification" ("userId", "createdAt" DESC);
