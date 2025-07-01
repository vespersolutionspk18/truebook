-- AlterTable
ALTER TABLE "NeoVin" ADD COLUMN "vehicleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NeoVin_vehicleId_key" ON "NeoVin"("vehicleId");

-- AddForeignKey
ALTER TABLE "NeoVin" ADD CONSTRAINT "NeoVin_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;