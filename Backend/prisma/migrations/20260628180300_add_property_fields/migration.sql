-- CreateEnum
CREATE TYPE "TelecallerStatus" AS ENUM ('VERIFIED', 'REVIEW_NEEDED', 'BLANK');
CREATE TYPE "FacingOption" AS ENUM ('FRONT', 'REAR');
CREATE TYPE "UnitAccessLocation" AS ENUM ('MAIN_ROAD', 'INSIDE');

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN "landlord_name" TEXT;
ALTER TABLE "buildings" ADD COLUMN "telecaller_status" "TelecallerStatus" DEFAULT 'BLANK';
ALTER TABLE "buildings" ADD COLUMN "star_rating" INTEGER;
ALTER TABLE "buildings" ADD COLUMN "facing_option" "FacingOption";
ALTER TABLE "buildings" ADD COLUMN "unit_access_location" "UnitAccessLocation";
