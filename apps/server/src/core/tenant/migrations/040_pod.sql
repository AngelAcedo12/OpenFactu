-- Prueba de entrega (Proof of Delivery) por parada de ruta.
--   recipientName       : quien recibe
--   recipientDocument   : DNI/NIF del receptor
--   signatureImage      : data URL base64 de la firma capturada en el móvil
--   photoImage          : data URL base64 de la foto de la entrega
--   podNotes            : observaciones libres

ALTER TABLE "{{schema}}"."RouteStop" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "{{schema}}"."RouteStop" ADD COLUMN IF NOT EXISTS "recipientDocument" TEXT;
ALTER TABLE "{{schema}}"."RouteStop" ADD COLUMN IF NOT EXISTS "signatureImage" TEXT;
ALTER TABLE "{{schema}}"."RouteStop" ADD COLUMN IF NOT EXISTS "photoImage" TEXT;
ALTER TABLE "{{schema}}"."RouteStop" ADD COLUMN IF NOT EXISTS "podNotes" TEXT;
