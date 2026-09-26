-- Payroll: statutory tables for Day 15.
--
-- `applicableMonth` is DROPPED. It was a sentinel-zero column meant to let one
-- state charge a different amount in one month, and it made every February a
-- second slab row. `februaryAmount` on the same row says the same thing without
-- a second row and without a nullable column inside the unique constraint.
--
-- Written by hand from `prisma migrate diff` rather than `migrate dev`, which
-- refuses to run non-interactively once a drop is involved. The DROP is safe:
-- the only rows were four seeded Maharashtra slabs, cleared beforehand, and the
-- seed rewrites them in the new shape.

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('earning', 'deduction');

-- CreateEnum
CREATE TYPE "PtGender" AS ENUM ('male', 'female', 'any');

-- DropIndex
DROP INDEX "PtSlab_organizationId_state_idx";

-- DropIndex
DROP INDEX "PtSlab_organizationId_state_minGross_effectiveFrom_applicab_key";

-- AlterTable
ALTER TABLE "PtSlab" DROP COLUMN "applicableMonth",
ADD COLUMN     "februaryAmount" DECIMAL(10,2),
ADD COLUMN     "gender" "PtGender" NOT NULL DEFAULT 'any';

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL DEFAULT 'earning',
    "countsForPf" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsiCoverage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "covered" BOOLEAN NOT NULL,
    "lockedWageRate" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsiCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryComponent_organizationId_archivedAt_idx" ON "SalaryComponent"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryComponent_organizationId_code_key" ON "SalaryComponent"("organizationId", "code");

-- CreateIndex
CREATE INDEX "EsiCoverage_organizationId_periodStart_idx" ON "EsiCoverage"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "EsiCoverage_organizationId_employeeId_periodStart_key" ON "EsiCoverage"("organizationId", "employeeId", "periodStart");

-- CreateIndex
CREATE INDEX "PtSlab_organizationId_state_gender_idx" ON "PtSlab"("organizationId", "state", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "PtSlab_organizationId_state_gender_minGross_effectiveFrom_key" ON "PtSlab"("organizationId", "state", "gender", "minGross", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "SalaryComponent" ADD CONSTRAINT "SalaryComponent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsiCoverage" ADD CONSTRAINT "EsiCoverage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsiCoverage" ADD CONSTRAINT "EsiCoverage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

