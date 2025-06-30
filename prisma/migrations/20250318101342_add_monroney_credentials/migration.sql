-- CreateTable
CREATE TABLE "MonroneyCredentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonroneyCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonroneyCredentials_userId_key" ON "MonroneyCredentials"("userId");

-- CreateIndex
CREATE INDEX "MonroneyCredentials_userId_idx" ON "MonroneyCredentials"("userId");

-- AddForeignKey
ALTER TABLE "MonroneyCredentials" ADD CONSTRAINT "MonroneyCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
