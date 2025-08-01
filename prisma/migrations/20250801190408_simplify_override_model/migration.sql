-- Drop existing columns
ALTER TABLE "AccessoryOverride" DROP COLUMN "userOverride";
ALTER TABLE "AccessoryOverride" DROP COLUMN "tradeValue";
ALTER TABLE "AccessoryOverride" DROP COLUMN "retailValue";
ALTER TABLE "AccessoryOverride" DROP COLUMN "loanValue";
ALTER TABLE "AccessoryOverride" DROP COLUMN "aiReason";
ALTER TABLE "AccessoryOverride" DROP COLUMN "userReason";

-- Add new simple override column
ALTER TABLE "AccessoryOverride" ADD COLUMN "keepJdPower" BOOLEAN NOT NULL DEFAULT false;