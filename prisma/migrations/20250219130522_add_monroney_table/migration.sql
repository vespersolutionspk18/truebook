-- CreateTable
CREATE TABLE "Monroney" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monroney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonroneyPair" (
    "id" TEXT NOT NULL,
    "property" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "monroneyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonroneyPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Monroney_vin_key" ON "Monroney"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Monroney_vehicleId_key" ON "Monroney"("vehicleId");

-- CreateIndex
CREATE INDEX "Monroney_vehicleId_idx" ON "Monroney"("vehicleId");

-- CreateIndex
CREATE INDEX "MonroneyPair_monroneyId_idx" ON "MonroneyPair"("monroneyId");

-- CreateIndex
CREATE INDEX "MonroneyPair_property_idx" ON "MonroneyPair"("property");

-- AddForeignKey
ALTER TABLE "Monroney" ADD CONSTRAINT "Monroney_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonroneyPair" ADD CONSTRAINT "MonroneyPair_monroneyId_fkey" FOREIGN KEY ("monroneyId") REFERENCES "Monroney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
