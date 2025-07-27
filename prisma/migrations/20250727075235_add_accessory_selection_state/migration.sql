-- AlterTable
ALTER TABLE "BookoutAccessory" ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSelected" BOOLEAN NOT NULL DEFAULT false;
