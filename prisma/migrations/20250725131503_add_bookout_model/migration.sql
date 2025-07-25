-- CreateTable
CREATE TABLE "Bookout" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mileage" INTEGER,
    "region" INTEGER,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "baseMsrp" INTEGER,
    "cleanTradeIn" INTEGER,
    "averageTradeIn" INTEGER,
    "roughTradeIn" INTEGER,
    "cleanRetail" INTEGER,
    "loanValue" INTEGER,
    "mileageAdjustment" INTEGER,
    "averageMileage" INTEGER,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bookout_vehicleId_idx" ON "Bookout"("vehicleId");

-- CreateIndex
CREATE INDEX "Bookout_provider_idx" ON "Bookout"("provider");

-- CreateIndex
CREATE INDEX "Bookout_createdAt_idx" ON "Bookout"("createdAt");

-- AddForeignKey
ALTER TABLE "Bookout" ADD CONSTRAINT "Bookout_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
