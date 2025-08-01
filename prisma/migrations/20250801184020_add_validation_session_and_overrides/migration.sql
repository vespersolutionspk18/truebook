-- CreateTable
CREATE TABLE "ValidationSession" (
    "id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "bookoutId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryOverride" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accessoryCode" TEXT NOT NULL,
    "accessoryName" TEXT NOT NULL,
    "aiRecommendation" TEXT NOT NULL,
    "userOverride" TEXT NOT NULL,
    "originalSelected" BOOLEAN NOT NULL,
    "tradeValue" INTEGER,
    "retailValue" INTEGER,
    "loanValue" INTEGER,
    "aiReason" TEXT NOT NULL,
    "userReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValidationSession_validationId_key" ON "ValidationSession"("validationId");

-- CreateIndex
CREATE INDEX "ValidationSession_vehicleId_idx" ON "ValidationSession"("vehicleId");

-- CreateIndex
CREATE INDEX "ValidationSession_bookoutId_idx" ON "ValidationSession"("bookoutId");

-- CreateIndex
CREATE INDEX "ValidationSession_status_idx" ON "ValidationSession"("status");

-- CreateIndex
CREATE INDEX "ValidationSession_expiresAt_idx" ON "ValidationSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessoryOverride_sessionId_idx" ON "AccessoryOverride"("sessionId");

-- CreateIndex
CREATE INDEX "AccessoryOverride_accessoryCode_idx" ON "AccessoryOverride"("accessoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "AccessoryOverride_sessionId_accessoryCode_key" ON "AccessoryOverride"("sessionId", "accessoryCode");

-- AddForeignKey
ALTER TABLE "ValidationSession" ADD CONSTRAINT "ValidationSession_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "AIValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryOverride" ADD CONSTRAINT "AccessoryOverride_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ValidationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;