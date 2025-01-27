-- CreateTable
CREATE TABLE "TestHistory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "logs" TEXT NOT NULL,

    CONSTRAINT "TestHistory_pkey" PRIMARY KEY ("id")
);
