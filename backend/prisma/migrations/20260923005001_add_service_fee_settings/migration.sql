-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "service_fee_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "service_fee_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
