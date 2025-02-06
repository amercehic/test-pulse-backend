/*
  Warnings:

  - You are about to drop the column `duration` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `logs` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `previousRunId` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `testRunId` on the `Test` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Test` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Test` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_previousRunId_fkey";

-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_testRunId_fkey";

-- AlterTable
ALTER TABLE "Test" DROP COLUMN "duration",
DROP COLUMN "logs",
DROP COLUMN "previousRunId",
DROP COLUMN "status",
DROP COLUMN "testRunId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "suite" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TestHistory" ALTER COLUMN "duration" DROP NOT NULL,
ALTER COLUMN "logs" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TestRun" ALTER COLUMN "status" SET DEFAULT 'queued',
ALTER COLUMN "duration" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TestExecution" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "duration" DOUBLE PRECISION,
    "logs" TEXT,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "screenshotUrl" TEXT,
    "videoUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestExecution_status_idx" ON "TestExecution"("status");

-- CreateIndex
CREATE INDEX "TestExecution_testId_testRunId_idx" ON "TestExecution"("testId", "testRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Test_name_key" ON "Test"("name");

-- CreateIndex
CREATE INDEX "Test_name_idx" ON "Test"("name");

-- CreateIndex
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
