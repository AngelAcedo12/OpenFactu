-- 024_partner_geo.sql — columnas geo en partner tables

ALTER TABLE "{{schema}}"."BusinessPartner" ADD COLUMN IF NOT EXISTS "countryCode" text;

ALTER TABLE "{{schema}}"."PartnerAddress" ADD COLUMN IF NOT EXISTS "countryCode" text;
ALTER TABLE "{{schema}}"."PartnerAddress" ADD COLUMN IF NOT EXISTS "subRegionId" text;
ALTER TABLE "{{schema}}"."PartnerAddress" ADD COLUMN IF NOT EXISTS "localityId" text;
