/*
  Warnings:

  - Made the column `applicableMonth` on table `PtSlab` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PtSlab" ALTER COLUMN "applicableMonth" SET NOT NULL,
ALTER COLUMN "applicableMonth" SET DEFAULT 0;
