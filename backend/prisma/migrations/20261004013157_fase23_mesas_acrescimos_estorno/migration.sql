-- AlterTable
ALTER TABLE "table_sessions" ADD COLUMN     "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "extra_charge_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "extra_charge_note" TEXT;

-- CreateTable
CREATE TABLE "_TableWaiters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TableWaiters_AB_unique" ON "_TableWaiters"("A", "B");

-- CreateIndex
CREATE INDEX "_TableWaiters_B_index" ON "_TableWaiters"("B");

-- AddForeignKey
ALTER TABLE "_TableWaiters" ADD CONSTRAINT "_TableWaiters_A_fkey" FOREIGN KEY ("A") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TableWaiters" ADD CONSTRAINT "_TableWaiters_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
