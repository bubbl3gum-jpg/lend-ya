/*
  Warnings:

  - You are about to alter the column `pricePerDay` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `depositAmount` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "pricePerDay" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "depositAmount" SET DATA TYPE DECIMAL(12,2);
