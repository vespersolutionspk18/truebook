-- CreateTable
CREATE TABLE "AIValidation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "bookoutId" TEXT,
    "provider" TEXT NOT NULL,
    "validationType" TEXT NOT NULL,
    "inputData" JSONB NOT NULL,
    "outputData" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIValidation_vehicleId_idx" ON "AIValidation"("vehicleId");

-- CreateIndex
CREATE INDEX "AIValidation_provider_idx" ON "AIValidation"("provider");

-- CreateIndex
CREATE INDEX "AIValidation_validationType_idx" ON "AIValidation"("validationType");

-- CreateIndex
CREATE INDEX "AIValidation_createdAt_idx" ON "AIValidation"("createdAt");
