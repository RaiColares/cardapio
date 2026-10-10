-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "accepted_payment_methods" TEXT[] DEFAULT ARRAY['CASH', 'CARD', 'PIX']::TEXT[];
