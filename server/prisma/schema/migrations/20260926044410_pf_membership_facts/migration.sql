-- AlterTable
ALTER TABLE "EmployeeStatutoryIdentity" ADD COLUMN     "hasPriorPfMembership" BOOLEAN,
ADD COLUMN     "pfApplicable" BOOLEAN NOT NULL DEFAULT true;

