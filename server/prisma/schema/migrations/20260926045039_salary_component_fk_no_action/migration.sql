-- NO ACTION rather than RESTRICT on the component foreign key.
--
-- Postgres checks RESTRICT the instant the referenced row goes, so deleting a
-- whole organization could trip it mid-cascade depending on which child table
-- the cascade reached first. NO ACTION waits until the statement finishes.
-- Deleting a component somebody is still paid is refused either way.

-- DropForeignKey
ALTER TABLE "EmployeeSalaryComponent" DROP CONSTRAINT "EmployeeSalaryComponent_salaryComponentId_fkey";

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_salaryComponentId_fkey" FOREIGN KEY ("salaryComponentId") REFERENCES "SalaryComponent"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
