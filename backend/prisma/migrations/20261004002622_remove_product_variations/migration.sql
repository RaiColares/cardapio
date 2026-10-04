/*
  Warnings:

  - You are about to drop the column `product_variant_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the `product_variants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "product_variant_id";

-- DropTable
DROP TABLE "product_variants";
