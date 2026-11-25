-- Prisopdeling på bookinger: leveringsgebyr og depositum gemmes, så en booking altid kan forklares bagefter.
-- Rent additiv og idempotent. Gamle bookinger får 0.
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deliveryFee" integer NOT NULL DEFAULT 0;
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "deposit" integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_amounts_valid') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_amounts_valid" CHECK ("total" >= 0 AND "deliveryFee" >= 0 AND "deposit" >= 0);
  END IF;
END $$;
