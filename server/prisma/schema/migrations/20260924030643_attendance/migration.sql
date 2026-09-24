-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('punch', 'biometric', 'manual', 'leave');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'half_day', 'absent', 'on_leave', 'holiday', 'weekly_off');

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMPTZ(3),
    "checkOut" TIMESTAMPTZ(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'absent',
    "source" "AttendanceSource" NOT NULL DEFAULT 'punch',
    "hoursWorked" DECIMAL(5,2),
    "shiftId" TEXT,
    "expectedHours" DECIMAL(4,2),
    "checkInLatitude" DECIMAL(10,7),
    "checkInLongitude" DECIMAL(10,7),
    "checkInDistanceMeters" INTEGER,
    "checkInAccuracyMeters" INTEGER,
    "geofenceVerified" BOOLEAN,
    "note" TEXT,
    "markedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_organizationId_date_idx" ON "Attendance"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Attendance_organizationId_employeeId_date_idx" ON "Attendance"("organizationId", "employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_organizationId_employeeId_date_key" ON "Attendance"("organizationId", "employeeId", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
