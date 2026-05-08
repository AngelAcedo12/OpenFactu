-- Movimientos internos de stock: traspasos entre almacenes, entradas y salidas.
--
-- 3 pares header/lines. Imitan la estructura de SalesDeliveryNote* pero sin
-- partner, impuestos ni integración contable — son puramente de inventario.

-- ── TRASPASOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."TransferNote" (
  "id"               TEXT PRIMARY KEY,
  "code"             TEXT NOT NULL,
  "fromWarehouseId"  TEXT NOT NULL,
  "toWarehouseId"    TEXT NOT NULL,
  "date"             DATE NOT NULL DEFAULT CURRENT_DATE,
  "status"           TEXT NOT NULL DEFAULT 'draft',  -- draft|sent|received|cancelled
  "notes"            TEXT,
  "sentAt"           TIMESTAMP,
  "receivedAt"       TIMESTAMP,
  "createdByUserId"  TEXT,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."TransferNoteLine" (
  "id"          TEXT PRIMARY KEY,
  "transferId"  TEXT NOT NULL REFERENCES "{{schema}}"."TransferNote"("id") ON DELETE CASCADE,
  "lineNum"     INTEGER NOT NULL,
  "itemId"      TEXT NOT NULL,
  "quantity"    DOUBLE PRECISION NOT NULL,
  "notes"       TEXT
);

CREATE INDEX IF NOT EXISTS "TransferNoteLine_transferId_idx"
  ON "{{schema}}"."TransferNoteLine" ("transferId");

-- ── ENTRADAS (GoodsReceipt) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."GoodsReceipt" (
  "id"             TEXT PRIMARY KEY,
  "code"           TEXT NOT NULL,
  "warehouseId"    TEXT NOT NULL,
  "date"           DATE NOT NULL DEFAULT CURRENT_DATE,
  "type"           TEXT NOT NULL DEFAULT 'internal', -- internal|return|adjustment
  "status"         TEXT NOT NULL DEFAULT 'draft',    -- draft|posted|cancelled
  "notes"          TEXT,
  "postedAt"       TIMESTAMP,
  "createdByUserId" TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."GoodsReceiptLine" (
  "id"         TEXT PRIMARY KEY,
  "receiptId"  TEXT NOT NULL REFERENCES "{{schema}}"."GoodsReceipt"("id") ON DELETE CASCADE,
  "lineNum"    INTEGER NOT NULL,
  "itemId"     TEXT NOT NULL,
  "quantity"   DOUBLE PRECISION NOT NULL,
  "notes"      TEXT
);

CREATE INDEX IF NOT EXISTS "GoodsReceiptLine_receiptId_idx"
  ON "{{schema}}"."GoodsReceiptLine" ("receiptId");

-- ── SALIDAS (GoodsIssue) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "{{schema}}"."GoodsIssue" (
  "id"             TEXT PRIMARY KEY,
  "code"           TEXT NOT NULL,
  "warehouseId"    TEXT NOT NULL,
  "date"           DATE NOT NULL DEFAULT CURRENT_DATE,
  "type"           TEXT NOT NULL DEFAULT 'internal', -- internal|scrap|adjustment
  "status"         TEXT NOT NULL DEFAULT 'draft',    -- draft|posted|cancelled
  "notes"          TEXT,
  "postedAt"       TIMESTAMP,
  "createdByUserId" TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{schema}}"."GoodsIssueLine" (
  "id"       TEXT PRIMARY KEY,
  "issueId"  TEXT NOT NULL REFERENCES "{{schema}}"."GoodsIssue"("id") ON DELETE CASCADE,
  "lineNum"  INTEGER NOT NULL,
  "itemId"   TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "notes"    TEXT
);

CREATE INDEX IF NOT EXISTS "GoodsIssueLine_issueId_idx"
  ON "{{schema}}"."GoodsIssueLine" ("issueId");
