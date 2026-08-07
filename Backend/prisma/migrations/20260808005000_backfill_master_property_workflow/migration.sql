-- Existing properties predate the Property Intake workflow.
-- Mark them as verified/master records so only newly collected rider submissions
-- enter the temporary intake queue.
UPDATE "buildings"
SET "telecaller_status" = 'VERIFIED'
WHERE "telecaller_status" IS NULL
   OR "telecaller_status" = 'BLANK';
