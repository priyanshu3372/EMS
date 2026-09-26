-- DropIndex
DROP INDEX "EmployeeSalaryComponent_employeeFinancialId_salaryComponent_key";

-- DropIndex
DROP INDEX "EmployeeSalaryComponent_organizationId_employeeFinancialId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryComponent_organizationId_employeeFinancialId__key" ON "EmployeeSalaryComponent"("organizationId", "employeeFinancialId", "salaryComponentId");

