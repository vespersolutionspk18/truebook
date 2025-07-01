/*
  Warnings:

  - Made the column `vehicleId` on table `NeoVin` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "NeoVin" ALTER COLUMN "vehicleId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "NeoVin_vehicleId_idx" ON "NeoVin"("vehicleId");
