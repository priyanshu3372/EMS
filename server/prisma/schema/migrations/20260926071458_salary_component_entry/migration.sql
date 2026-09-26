-- Salary components say where their amount comes from.
--
-- `fixed` components are amounts on the salary record, prorated by paid days.
-- `monthly` components are entered per employee per month and paid as entered —
-- the client's rule for Incentive (§A1.5).

-- CreateEnum
CREATE TYPE "ComponentEntry" AS ENUM ('fixed', 'monthly');

-- AlterTable
ALTER TABLE "SalaryComponent" ADD COLUMN     "entry" "ComponentEntry" NOT NULL DEFAULT 'fixed';


-- Incentive rows seeded before this column existed were created as `fixed`,
-- and the seed never overwrites an existing component (every write is an
-- upsert with an empty update), so re-running it would not correct them.
-- Matched on the code the seed itself uses.
UPDATE "SalaryComponent" SET "entry" = 'monthly' WHERE "code" = 'INCENTIVE';
