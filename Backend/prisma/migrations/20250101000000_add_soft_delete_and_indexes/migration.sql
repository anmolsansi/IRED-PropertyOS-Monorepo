-- AlterTable: Add deletedAt column for soft-delete support
ALTER TABLE "buildings" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "floors" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "units" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex: Performance indexes for soft-delete queries
CREATE INDEX "buildings_deleted_at_idx" ON "buildings"("deleted_at");
CREATE INDEX "floors_deleted_at_idx" ON "floors"("deleted_at");
CREATE INDEX "units_deleted_at_idx" ON "units"("deleted_at");
CREATE INDEX "contacts_deleted_at_idx" ON "contacts"("deleted_at");

-- CreateIndex: Additional composite indexes for common query patterns
CREATE INDEX "buildings_state_id_idx" ON "buildings"("state_id");
CREATE INDEX "buildings_city_id_idx" ON "buildings"("city_id");
CREATE INDEX "buildings_locality_id_idx" ON "buildings"("locality_id");
CREATE INDEX "buildings_property_type_id_idx" ON "buildings"("property_type_id");
CREATE INDEX "buildings_availability_status_id_idx" ON "buildings"("availability_status_id");
CREATE INDEX "buildings_created_by_idx" ON "buildings"("created_by");

CREATE INDEX "floors_building_id_idx" ON "floors"("building_id");

CREATE INDEX "units_building_id_idx" ON "units"("building_id");
CREATE INDEX "units_floor_id_idx" ON "units"("floor_id");
CREATE INDEX "units_property_type_id_idx" ON "units"("property_type_id");
CREATE INDEX "units_availability_status_id_idx" ON "units"("availability_status_id");
CREATE INDEX "units_assigned_worker_id_idx" ON "units"("assigned_worker_id");

CREATE INDEX "contacts_building_id_idx" ON "contacts"("building_id");
CREATE INDEX "contacts_floor_id_idx" ON "contacts"("floor_id");
CREATE INDEX "contacts_unit_id_idx" ON "contacts"("unit_id");
CREATE INDEX "contacts_contact_role_id_idx" ON "contacts"("contact_role_id");

-- CreateIndex: V2 entity soft-delete indexes (already exist but ensure)
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");
CREATE INDEX "site_visits_deleted_at_idx" ON "site_visits"("deleted_at");
CREATE INDEX "deals_deleted_at_idx" ON "deals"("deleted_at");

-- CreateIndex: Performance indexes for common V2 query patterns
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

CREATE INDEX "site_visits_scheduled_at_idx" ON "site_visits"("scheduled_at");
CREATE INDEX "site_visits_assigned_to_idx" ON "site_visits"("assigned_to");

CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_assigned_to_idx" ON "deals"("assigned_to");

-- CreateIndex: Audit and version snapshot indexes
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events"("actor_user_id");
CREATE INDEX "audit_events_event_type_idx" ON "audit_events"("event_type");
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

CREATE INDEX "version_snapshots_entity_type_entity_id_idx" ON "version_snapshots"("entity_type", "entity_id");
CREATE INDEX "version_snapshots_created_at_idx" ON "version_snapshots"("created_at");
