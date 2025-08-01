-- Remove userId from Vehicle table
-- This migration removes the direct user-vehicle relationship
-- as vehicles should belong to organizations, not individual users

-- Drop the foreign key constraint
ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "Vehicle_userId_fkey";

-- Drop the index on userId
DROP INDEX IF EXISTS "Vehicle_userId_idx";

-- Drop the userId column
ALTER TABLE "Vehicle" DROP COLUMN IF EXISTS "userId";

-- Add a comment to track this migration
COMMENT ON TABLE "Vehicle" IS 'Vehicles belong to organizations, not individual users. userId column removed in favor of organizationId-based ownership.';