-- CreateTable
CREATE TABLE "BookoutSnapshot" (
    "id" TEXT NOT NULL,
    "originalBookoutId" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookoutSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookoutChangeLog" (
    "id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "bookoutId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityCode" TEXT,
    "fieldName" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "valueDifference" INTEGER,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "aiValidationStatus" TEXT,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookoutChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookoutSnapshot_validationId_key" ON "BookoutSnapshot"("validationId");

-- CreateIndex
CREATE INDEX "BookoutSnapshot_originalBookoutId_idx" ON "BookoutSnapshot"("originalBookoutId");

-- CreateIndex
CREATE INDEX "BookoutSnapshot_validationId_idx" ON "BookoutSnapshot"("validationId");

-- CreateIndex
CREATE INDEX "BookoutSnapshot_createdAt_idx" ON "BookoutSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "BookoutChangeLog_validationId_idx" ON "BookoutChangeLog"("validationId");

-- CreateIndex
CREATE INDEX "BookoutChangeLog_bookoutId_idx" ON "BookoutChangeLog"("bookoutId");

-- CreateIndex
CREATE INDEX "BookoutChangeLog_changeType_idx" ON "BookoutChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "BookoutChangeLog_sequence_idx" ON "BookoutChangeLog"("sequence");

-- AddForeignKey
ALTER TABLE "BookoutSnapshot" ADD CONSTRAINT "BookoutSnapshot_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "AIValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookoutChangeLog" ADD CONSTRAINT "BookoutChangeLog_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "AIValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
