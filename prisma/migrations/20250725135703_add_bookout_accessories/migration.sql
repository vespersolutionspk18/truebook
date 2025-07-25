-- CreateTable
CREATE TABLE "BookoutAccessory" (
    "id" TEXT NOT NULL,
    "bookoutId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "category" TEXT,
    "msrp" INTEGER,
    "cleanTradeAdj" INTEGER,
    "averageTradeAdj" INTEGER,
    "roughTradeAdj" INTEGER,
    "cleanRetailAdj" INTEGER,
    "loanAdj" INTEGER,
    "includesCode" TEXT,
    "excludesCode" TEXT,
    "isFactoryInstalled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookoutAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookoutAccessory_bookoutId_idx" ON "BookoutAccessory"("bookoutId");

-- CreateIndex
CREATE INDEX "BookoutAccessory_code_idx" ON "BookoutAccessory"("code");

-- AddForeignKey
ALTER TABLE "BookoutAccessory" ADD CONSTRAINT "BookoutAccessory_bookoutId_fkey" FOREIGN KEY ("bookoutId") REFERENCES "Bookout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
