/*
  Warnings:

  - The `status` column on the `TestExecution` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `TestRun` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('queued', 'running', 'completed', 'cancelled', 'failed', 'timeout', 'error');

-- CreateEnum
CREATE TYPE "TestExecutionStatus" AS ENUM ('queued', 'running', 'passed', 'failed', 'skipped', 'cancelled', 'blocked', 'timeout', 'error', 'flaky', 'quarantined');

-- AlterTable
ALTER TABLE "TestExecution" DROP COLUMN "status",
ADD COLUMN     "status" "TestExecutionStatus" NOT NULL DEFAULT 'queued';

-- AlterTable
ALTER TABLE "TestRun" DROP COLUMN "status",
ADD COLUMN     "status" "TestRunStatus" NOT NULL DEFAULT 'queued';

-- CreateIndex
CREATE INDEX "TestExecution_status_idx" ON "TestExecution"("status");

-- CreateIndex
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");
