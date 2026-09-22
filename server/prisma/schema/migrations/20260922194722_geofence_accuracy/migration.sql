-- AlterTable
ALTER TABLE "GeofenceLocation" ADD COLUMN     "maxAccuracyMeters" INTEGER NOT NULL DEFAULT 50,
ALTER COLUMN "radiusMeters" SET DEFAULT 30;
