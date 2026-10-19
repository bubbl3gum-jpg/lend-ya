-- Nullable columns preserve every existing booking and allow intentional independent requests.
ALTER TABLE "Booking" ADD COLUMN "requestKey" VARCHAR(128), ADD COLUMN "requestHash" VARCHAR(64);
CREATE UNIQUE INDEX "Booking_renterId_requestKey_key" ON "Booking"("renterId", "requestKey");
