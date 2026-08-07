-- Property Intake starts with this release. Any REVIEW_NEEDED rows that existed
-- before the workflow rollout are existing master properties, not intake items.
UPDATE "buildings"
SET "telecaller_status" = 'VERIFIED'
WHERE "telecaller_status" = 'REVIEW_NEEDED';
