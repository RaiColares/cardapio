-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "gateway_response" JSONB,
ADD COLUMN     "gateway_transaction_id" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
