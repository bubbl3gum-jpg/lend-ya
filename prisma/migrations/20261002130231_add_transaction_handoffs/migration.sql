-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EQUIPMENT_RENTAL', 'SERVICE', 'BORROW');

-- CreateEnum
CREATE TYPE "HandoffType" AS ENUM ('BORROW', 'RETURN');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_rentalRequestId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'EQUIPMENT_RENTAL',
ALTER COLUMN "rentalRequestId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Handoff" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "type" "HandoffType" NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serialNumber" TEXT,
    "conditionNotes" TEXT,
    "conditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Handoff_transactionId_type_key" ON "Handoff"("transactionId", "type");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rentalRequestId_fkey" FOREIGN KEY ("rentalRequestId") REFERENCES "RentalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
