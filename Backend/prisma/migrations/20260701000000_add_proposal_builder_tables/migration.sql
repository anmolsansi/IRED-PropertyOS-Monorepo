DO $$ BEGIN
  CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'exported', 'sent', 'accepted', 'rejected', 'expired', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProposalEntityType" AS ENUM ('building', 'floor', 'unit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "proposals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "client_id" UUID NOT NULL,
  "requirement_id" UUID,
  "title" TEXT,
  "notes" TEXT,
  "unit_ids" JSONB,
  "fields_config" JSONB,
  "pdf_storage_key" TEXT,
  "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
  "exported_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "requirement_id" UUID;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "unit_ids" JSONB;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "fields_config" JSONB;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "pdf_storage_key" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "exported_at" TIMESTAMP(3);

UPDATE "proposals" SET "unit_ids" = '[]'::jsonb WHERE "unit_ids" IS NULL;
ALTER TABLE "proposals" ALTER COLUMN "unit_ids" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "proposal_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proposal_id" UUID NOT NULL,
  "entity_type" "ProposalEntityType" NOT NULL,
  "building_id" UUID,
  "floor_id" UUID,
  "unit_id" UUID,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "snapshot_json" JSONB,
  "added_by" UUID,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removed_at" TIMESTAMP(3),
  CONSTRAINT "proposal_items_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_fkey"
    FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_building_id_fkey"
    FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_floor_id_fkey"
    FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_added_by_fkey"
    FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "proposals_client_id_idx" ON "proposals"("client_id");
CREATE INDEX IF NOT EXISTS "proposals_created_by_idx" ON "proposals"("created_by");
CREATE INDEX IF NOT EXISTS "proposals_organization_id_idx" ON "proposals"("organization_id");
CREATE INDEX IF NOT EXISTS "proposals_status_idx" ON "proposals"("status");

CREATE INDEX IF NOT EXISTS "proposal_items_proposal_id_idx" ON "proposal_items"("proposal_id");
CREATE INDEX IF NOT EXISTS "proposal_items_building_id_idx" ON "proposal_items"("building_id");
CREATE INDEX IF NOT EXISTS "proposal_items_floor_id_idx" ON "proposal_items"("floor_id");
CREATE INDEX IF NOT EXISTS "proposal_items_unit_id_idx" ON "proposal_items"("unit_id");
CREATE INDEX IF NOT EXISTS "proposal_items_added_by_idx" ON "proposal_items"("added_by");
CREATE UNIQUE INDEX IF NOT EXISTS "proposal_items_proposal_id_entity_type_building_id_floor_id_unit_id_key"
  ON "proposal_items"("proposal_id", "entity_type", "building_id", "floor_id", "unit_id");
