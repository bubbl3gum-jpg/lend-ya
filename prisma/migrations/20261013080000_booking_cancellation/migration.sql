ALTER TABLE "Booking" ADD COLUMN "cancelledBy" INTEGER, ADD COLUMN "cancelledAt" TIMESTAMP(3), ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN "dailyPrice" DECIMAL(12,2);
