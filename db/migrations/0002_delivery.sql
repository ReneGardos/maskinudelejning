-- Levering eller afhentning på bookinger. Idempotent.
-- Kolonnenavnene matcher den eksisterende produktionsdatabase (deliveryType/deliveryAddress/deliveryPostalCode).
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryType" text NOT NULL DEFAULT 'collection';
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryAddress" text;
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryPostalCode" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_delivery_valid') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_delivery_valid" CHECK (
      ("deliveryType" = 'collection')
      OR ("deliveryType" = 'delivery' AND "deliveryAddress" IS NOT NULL AND "deliveryPostalCode" IS NOT NULL)
    );
  END IF;
END $$;
