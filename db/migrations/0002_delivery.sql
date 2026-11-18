-- Levering eller afhentning på bookinger. Idempotent.
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryMethod" text NOT NULL DEFAULT 'pickup';
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryAddress" text;
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryPostcode" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_delivery_valid') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_delivery_valid" CHECK (
      ("deliveryMethod" = 'pickup')
      OR ("deliveryMethod" = 'delivery' AND "deliveryAddress" IS NOT NULL AND "deliveryPostcode" IS NOT NULL)
    );
  END IF;
END $$;
