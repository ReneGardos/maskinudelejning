-- Idempotent: kan køres på en tom database og på en database, hvor tabellerne allerede findes.

-- ── better-auth ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "role" text NOT NULL DEFAULT 'user',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "password" text,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- ── maskiner og bookinger ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "machine" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "dailyPrice" integer NOT NULL,
  "image" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "booking" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "machineName" text NOT NULL,
  "machineSlug" text NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "customerName" text NOT NULL,
  "customerEmail" text NOT NULL,
  "customerPhone" text NOT NULL,
  "notes" text,
  "status" text NOT NULL DEFAULT 'pending',
  "total" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "booking_userId_idx" ON "booking" ("userId");
CREATE INDEX IF NOT EXISTS "booking_machineSlug_idx" ON "booking" ("machineSlug");

-- Sikkerhedsnet i databasen: samme maskine kan ikke have to aktive, overlappende bookinger,
-- selv hvis to kunder booker i samme sekund. Perioderne er inklusive (daterange '[]').
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_dates_valid') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_dates_valid" CHECK ("endDate" >= "startDate");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_status_valid') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_status_valid" CHECK ("status" IN ('pending', 'confirmed', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_no_overlap') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
      EXCLUDE USING gist ("machineSlug" WITH =, daterange("startDate", "endDate", '[]') WITH &&)
      WHERE ("status" <> 'cancelled');
  END IF;
END $$;
