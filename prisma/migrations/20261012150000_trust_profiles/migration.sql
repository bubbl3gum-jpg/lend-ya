ALTER TABLE "User" ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "trustScore" INTEGER, ADD COLUMN "confidenceIndicator" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_trustScore_range" CHECK ("trustScore" BETWEEN 0 AND 100);
-- Existing verificationStatus is intentionally not promoted without platform evidence.
ALTER TABLE "Handoff" ADD COLUMN "photos" JSONB, ADD COLUMN "checklist" JSONB;
ALTER TABLE "Return" ADD COLUMN "photos" JSONB, ADD COLUMN "checklist" JSONB;
CREATE TABLE "VerifiedReview" (
 "id" SERIAL PRIMARY KEY, "bookingId" INTEGER NOT NULL REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "authorId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "subjectId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5), "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "VerifiedReview_distinct_users" CHECK ("authorId" <> "subjectId")
);
CREATE UNIQUE INDEX "VerifiedReview_bookingId_authorId_key" ON "VerifiedReview"("bookingId", "authorId");
CREATE INDEX "VerifiedReview_subjectId_idx" ON "VerifiedReview"("subjectId");
-- Defense in depth: reviews can only be inserted for the opposite participant
-- after both handoff and inspected return are confirmed.
CREATE FUNCTION validate_verified_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM "Booking" b JOIN "Handoff" h ON h."bookingId" = b.id JOIN "Return" r ON r."bookingId" = b.id
  WHERE b.id = NEW."bookingId" AND b.status = 'COMPLETED'
   AND h."confirmedAt" IS NOT NULL AND h."conditionConfirmed" = true
   AND r."confirmedAt" IS NOT NULL AND r."conditionConfirmed" = true
   AND ((b."ownerId" = NEW."authorId" AND b."renterId" = NEW."subjectId") OR (b."renterId" = NEW."authorId" AND b."ownerId" = NEW."subjectId"))
 ) THEN RAISE EXCEPTION 'Review requires a verified completed booking and opposite participants'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "VerifiedReview_eligibility" BEFORE INSERT OR UPDATE ON "VerifiedReview" FOR EACH ROW EXECUTE FUNCTION validate_verified_review();
