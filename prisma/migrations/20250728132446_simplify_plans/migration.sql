-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "plan" "PlanType" NOT NULL DEFAULT 'FREE';

-- Migrate existing subscription plans to new plan type
UPDATE "Organization" 
SET "plan" = CASE 
    WHEN "subscriptionPlan" IN ('BRONZE', 'SILVER', 'GOLD') THEN 'PRO'::"PlanType"
    WHEN "subscriptionPlan" = 'ENTERPRISE' THEN 'ENTERPRISE'::"PlanType"
    ELSE 'FREE'::"PlanType"
END;

-- AlterTable - Drop old columns
ALTER TABLE "Organization" DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus",
DROP COLUMN "subscriptionId",
DROP COLUMN "customerId",
DROP COLUMN "trialEndsAt";

-- DropEnum
DROP TYPE "SubscriptionPlan";
DROP TYPE "SubscriptionStatus";

-- CreateIndex
CREATE INDEX "Organization_plan_idx" ON "Organization"("plan");