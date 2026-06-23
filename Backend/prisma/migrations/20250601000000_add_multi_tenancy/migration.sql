-- Multi-Tenancy Migration
-- Adds organization support to IRED PropertyOS

-- ─── Create organizations table ──────────────────────────────
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- ─── Add organization_id to users ───────────────────────────
ALTER TABLE "users" ADD COLUMN "organization_id" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- ─── Add organization_id to buildings ───────────────────────
ALTER TABLE "buildings" ADD COLUMN "organization_id" UUID;
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "buildings_organization_id_idx" ON "buildings"("organization_id");

-- ─── Add organization_id to clients ─────────────────────────
ALTER TABLE "clients" ADD COLUMN "organization_id" UUID;
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- ─── Add organization_id to tasks ───────────────────────────
ALTER TABLE "tasks" ADD COLUMN "organization_id" UUID;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");

-- ─── Add organization_id to deals ───────────────────────────
ALTER TABLE "deals" ADD COLUMN "organization_id" UUID;
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "deals_organization_id_idx" ON "deals"("organization_id");

-- ─── Add organization_id to site_visits ─────────────────────
ALTER TABLE "site_visits" ADD COLUMN "organization_id" UUID;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "site_visits_organization_id_idx" ON "site_visits"("organization_id");

-- ─── Add organization_id to proposals ───────────────────────
ALTER TABLE "proposals" ADD COLUMN "organization_id" UUID;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "proposals_organization_id_idx" ON "proposals"("organization_id");
