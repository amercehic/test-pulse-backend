/*
  Warnings:

  - You are about to drop the column `screenshotUrl` on the `TestExecution` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `TestExecution` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TestExecution" DROP COLUMN "screenshotUrl",
DROP COLUMN "videoUrl",
ADD COLUMN     "screenshotKey" TEXT,
ADD COLUMN     "videoKey" TEXT;
