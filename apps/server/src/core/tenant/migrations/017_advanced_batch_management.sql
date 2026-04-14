-- Migración 017: Gestión Avanzada de Lotes y Series
-- Implementa la relación 1:N entre líneas de documento y lotes/series

CREATE TABLE IF NOT EXISTS "PurchaseDeliveryNoteLineBatch" (
    "id" TEXT PRIMARY KEY,
    "deliveryLineId" TEXT NOT NULL REFERENCES "PurchaseDeliveryNoteLine"("id") ON DELETE CASCADE,
    "batchNum" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "expiryDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PurchaseInvoiceLineBatch" (
    "id" TEXT PRIMARY KEY,
    "invoiceLineId" TEXT NOT NULL REFERENCES "PurchaseInvoiceLine"("id") ON DELETE CASCADE,
    "batchNum" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "expiryDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Nota: No eliminamos la columna batchNum de las líneas originales 
-- para mantener compatibilidad hacia atrás durante la transición,
-- pero el sistema empezará a usar las nuevas tablas.
