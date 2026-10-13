-- Add nullable participant statements without overwriting any legacy evidence.
ALTER TABLE "Handoff" ADD COLUMN "ownerConditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "borrowerConditionNotes" TEXT, ADD COLUMN "borrowerChecklist" JSONB, ADD COLUMN "borrowerPhotos" JSONB;
ALTER TABLE "Return" ADD COLUMN "returnConfirmed" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "inspectedBy" INTEGER, ADD COLUMN "inspectedAt" TIMESTAMP(3), ADD COLUMN "inspectionAccepted" BOOLEAN,
 ADD COLUMN "inspectionNotes" TEXT, ADD COLUMN "inspectionChecklist" JSONB, ADD COLUMN "inspectionPhotos" JSONB;
-- Legacy successful records retain their original confirmation semantics.
UPDATE "Handoff" SET "ownerConditionConfirmed" = true WHERE "conditionConfirmed" = true AND "confirmedAt" IS NOT NULL;
UPDATE "Return" SET "returnConfirmed" = true;
CREATE TABLE "BookingEvidencePhoto" (
 "id" TEXT PRIMARY KEY, "bookingId" INTEGER NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "uploaderId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "stage" VARCHAR(24) NOT NULL CHECK ("stage" IN ('HANDOFF_OWNER','HANDOFF_BORROWER','RETURN_BORROWER','INSPECTION_OWNER')),
 "mimeType" VARCHAR(32) NOT NULL CHECK ("mimeType" IN ('image/jpeg','image/png','image/webp')),
 "data" BYTEA NOT NULL CHECK (octet_length("data") > 0 AND octet_length("data") <= 5242880),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BookingEvidencePhoto_bookingId_stage_idx" ON "BookingEvidencePhoto"("bookingId","stage");
