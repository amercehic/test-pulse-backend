-- CreateTable
CREATE TABLE "TestRun" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "commit" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "browserVersion" TEXT NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "logs" TEXT NOT NULL,
    "testRunId" INTEGER NOT NULL,
    "previousRunId" INTEGER,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_previousRunId_fkey" FOREIGN KEY ("previousRunId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;
