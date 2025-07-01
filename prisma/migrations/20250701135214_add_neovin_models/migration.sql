-- CreateTable
CREATE TABLE "NeoVin" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "squishVin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "vehicleType" TEXT,
    "listingConfidence" TEXT,
    "trim" TEXT,
    "trimConfidence" TEXT,
    "version" TEXT,
    "versionConfidence" TEXT,
    "transmission" TEXT,
    "transmissionConfidence" TEXT,
    "transmissionDescription" TEXT,
    "drivetrain" TEXT,
    "powertrainType" TEXT,
    "engine" TEXT,
    "fuelType" TEXT,
    "doors" INTEGER,
    "bodyType" TEXT,
    "bodySubtype" TEXT,
    "weight" INTEGER,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "cityMpg" INTEGER,
    "highwayMpg" INTEGER,
    "combinedMpg" INTEGER,
    "manufacturerCode" TEXT,
    "packageCode" TEXT,
    "msrp" INTEGER,
    "deliveryCharges" INTEGER,
    "installedOptionsMsrp" INTEGER,
    "combinedMsrp" INTEGER,
    "country" TEXT,
    "seatingCapacity" INTEGER,
    "optionsPackages" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinInteriorColor" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "confidence" TEXT,
    "base" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinInteriorColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinExteriorColor" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "msrp" TEXT,
    "confidence" TEXT,
    "base" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinExteriorColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinRating" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "safetyFront" INTEGER,
    "safetySide" INTEGER,
    "safetyOverall" INTEGER,
    "rollover" INTEGER,
    "roofStrength" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinWarranty" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "totalDuration" INTEGER,
    "totalDistance" INTEGER,
    "powertrainDuration" INTEGER,
    "powertrainDistance" INTEGER,
    "antiCorrosionDuration" INTEGER,
    "antiCorrosionDistance" INTEGER,
    "roadsideAssistanceDuration" INTEGER,
    "roadsideAssistanceDistance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinInstalledOption" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "msrp" TEXT,
    "type" TEXT,
    "confidence" TEXT,
    "verified" BOOLEAN,
    "rule" TEXT,
    "salePrice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinInstalledOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinFeature" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "optionCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinHighValueFeature" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "optionCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinHighValueFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeoVinInstalledEquipment" (
    "id" TEXT NOT NULL,
    "neoVinId" TEXT NOT NULL,
    "optionCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "location" TEXT,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeoVinInstalledEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeoVin_vin_key" ON "NeoVin"("vin");

-- CreateIndex
CREATE INDEX "NeoVin_vin_idx" ON "NeoVin"("vin");

-- CreateIndex
CREATE INDEX "NeoVin_make_model_year_idx" ON "NeoVin"("make", "model", "year");

-- CreateIndex
CREATE UNIQUE INDEX "NeoVinInteriorColor_neoVinId_key" ON "NeoVinInteriorColor"("neoVinId");

-- CreateIndex
CREATE UNIQUE INDEX "NeoVinExteriorColor_neoVinId_key" ON "NeoVinExteriorColor"("neoVinId");

-- CreateIndex
CREATE UNIQUE INDEX "NeoVinRating_neoVinId_key" ON "NeoVinRating"("neoVinId");

-- CreateIndex
CREATE UNIQUE INDEX "NeoVinWarranty_neoVinId_key" ON "NeoVinWarranty"("neoVinId");

-- CreateIndex
CREATE INDEX "NeoVinInstalledOption_neoVinId_idx" ON "NeoVinInstalledOption"("neoVinId");

-- CreateIndex
CREATE INDEX "NeoVinInstalledOption_code_idx" ON "NeoVinInstalledOption"("code");

-- CreateIndex
CREATE INDEX "NeoVinFeature_neoVinId_idx" ON "NeoVinFeature"("neoVinId");

-- CreateIndex
CREATE INDEX "NeoVinFeature_optionCode_idx" ON "NeoVinFeature"("optionCode");

-- CreateIndex
CREATE INDEX "NeoVinFeature_category_idx" ON "NeoVinFeature"("category");

-- CreateIndex
CREATE INDEX "NeoVinHighValueFeature_neoVinId_idx" ON "NeoVinHighValueFeature"("neoVinId");

-- CreateIndex
CREATE INDEX "NeoVinHighValueFeature_optionCode_idx" ON "NeoVinHighValueFeature"("optionCode");

-- CreateIndex
CREATE INDEX "NeoVinHighValueFeature_category_idx" ON "NeoVinHighValueFeature"("category");

-- CreateIndex
CREATE INDEX "NeoVinInstalledEquipment_neoVinId_idx" ON "NeoVinInstalledEquipment"("neoVinId");

-- CreateIndex
CREATE INDEX "NeoVinInstalledEquipment_optionCode_idx" ON "NeoVinInstalledEquipment"("optionCode");

-- CreateIndex
CREATE INDEX "NeoVinInstalledEquipment_category_idx" ON "NeoVinInstalledEquipment"("category");

-- AddForeignKey
ALTER TABLE "NeoVinInteriorColor" ADD CONSTRAINT "NeoVinInteriorColor_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinExteriorColor" ADD CONSTRAINT "NeoVinExteriorColor_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinRating" ADD CONSTRAINT "NeoVinRating_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinWarranty" ADD CONSTRAINT "NeoVinWarranty_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinInstalledOption" ADD CONSTRAINT "NeoVinInstalledOption_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinFeature" ADD CONSTRAINT "NeoVinFeature_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinHighValueFeature" ADD CONSTRAINT "NeoVinHighValueFeature_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeoVinInstalledEquipment" ADD CONSTRAINT "NeoVinInstalledEquipment_neoVinId_fkey" FOREIGN KEY ("neoVinId") REFERENCES "NeoVin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
