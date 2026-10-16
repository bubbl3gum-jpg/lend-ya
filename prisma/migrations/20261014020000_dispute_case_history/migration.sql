-- Retain every original case and decision; allow a new case after obligations resume.
DROP INDEX "Dispute_bookingId_key";
CREATE INDEX "Dispute_bookingId_createdAt_idx" ON "Dispute"("bookingId", "createdAt");
CREATE UNIQUE INDEX "Dispute_one_open_case_per_booking" ON "Dispute"("bookingId") WHERE "status" = 'OPEN';
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_bookingId_fkey";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
