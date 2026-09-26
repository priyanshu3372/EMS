-- Per-employee salary components become rows.
--
-- The five dropped columns could not hold the client's own component list:
-- it ends with Incentive, which never had a column. Every further component
-- would have meant a migration and a deploy, which is how payroll systems end
-- up with one "Other Allowance" column holding six different things.
--
-- NO DATA IS COPIED ACROSS, because there is none — neither database has a
-- single EmployeeFinancial row. Against a populated database this migration
-- would need an INSERT ... SELECT that fans each column out into a row keyed
-- by its SalaryComponent, run BEFORE the DROP. Do not reuse this file there.

-- AlterTable
ALTER TABLE "EmployeeFinancial" DROP COLUMN "basic",
DROP COLUMN "conveyance",
DROP COLUMN "da",
DROP COLUMN "hra",
DROP COLUMN "specialAllowance";

-- CreateTable
CREATE TABLE "EmployeeSalaryComponent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeFinancialId" TEXT NOT NULL,
    "salaryComponentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeeSalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeSalaryComponent_organizationId_employeeFinancialId_idx" ON "EmployeeSalaryComponent"("organizationId", "employeeFinancialId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryComponent_employeeFinancialId_salaryComponent_key" ON "EmployeeSalaryComponent"("employeeFinancialId", "salaryComponentId");

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_employeeFinancialId_fkey" FOREIGN KEY ("employeeFinancialId") REFERENCES "EmployeeFinancial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_salaryComponentId_fkey" FOREIGN KEY ("salaryComponentId") REFERENCES "SalaryComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
