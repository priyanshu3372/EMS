-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('public', 'optional', 'weekly_off');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "OrganizationPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pfEmployeeRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "pfEmployerRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "pfRestrictToCeiling" BOOLEAN NOT NULL DEFAULT true,
    "pfWageCeiling" DECIMAL(12,2) NOT NULL DEFAULT 15000,
    "esiEmployeeRate" DECIMAL(5,2) NOT NULL DEFAULT 0.75,
    "esiEmployerRate" DECIMAL(5,2) NOT NULL DEFAULT 3.25,
    "esiThreshold" DECIMAL(12,2) NOT NULL DEFAULT 21000,
    "payDay" INTEGER NOT NULL DEFAULT 1,
    "payslipLockDay" INTEGER,
    "leaveYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrganizationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSlab" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "minGross" DECIMAL(12,2) NOT NULL,
    "maxGross" DECIMAL(12,2),
    "amount" DECIMAL(10,2) NOT NULL,
    "applicableMonth" INTEGER,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PtSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "HolidayType" NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GeofenceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationPolicy_organizationId_effectiveTo_idx" ON "OrganizationPolicy"("organizationId", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPolicy_organizationId_effectiveFrom_key" ON "OrganizationPolicy"("organizationId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PtSlab_organizationId_state_idx" ON "PtSlab"("organizationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "PtSlab_organizationId_state_minGross_effectiveFrom_applicab_key" ON "PtSlab"("organizationId", "state", "minGross", "effectiveFrom", "applicableMonth");

-- CreateIndex
CREATE INDEX "Holiday_organizationId_date_idx" ON "Holiday"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_organizationId_date_name_key" ON "Holiday"("organizationId", "date", "name");

-- CreateIndex
CREATE INDEX "GeofenceLocation_organizationId_isActive_idx" ON "GeofenceLocation"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GeofenceLocation_organizationId_name_key" ON "GeofenceLocation"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "OrganizationPolicy" ADD CONSTRAINT "OrganizationPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSlab" ADD CONSTRAINT "PtSlab_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceLocation" ADD CONSTRAINT "GeofenceLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
