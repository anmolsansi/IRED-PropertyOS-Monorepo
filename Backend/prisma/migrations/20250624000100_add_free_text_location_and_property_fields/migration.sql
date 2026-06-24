ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "city_name" TEXT,
  ADD COLUMN IF NOT EXISTS "locality_name" TEXT,
  ADD COLUMN IF NOT EXISTS "commercial_terms" JSONB,
  ADD COLUMN IF NOT EXISTS "additional_fields" JSONB;
