CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TYPE "BookingStatus" ADD VALUE 'ADMIN_CLOSED';
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Listing" ADD COLUMN "adminRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ListingReport" ADD COLUMN "resolvedAt" TIMESTAMP(3), ADD COLUMN "resolvedBy" INTEGER, ADD COLUMN "decisionReason" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "resolvedBy" INTEGER, ADD COLUMN "finding" TEXT, ADD COLUMN "decisionSummary" TEXT, ADD COLUMN "adminNotes" TEXT, ADD COLUMN "bookingOutcome" TEXT;
ALTER TABLE "ListingReport" DROP CONSTRAINT "ListingReport_listingId_fkey", DROP CONSTRAINT "ListingReport_reporterId_fkey";
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "AdminAuditLog" (
 "id" SERIAL PRIMARY KEY, "adminId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "action" VARCHAR(64) NOT NULL, "targetType" VARCHAR(32) NOT NULL, "targetId" INTEGER NOT NULL,
 "reason" VARCHAR(2000) NOT NULL CHECK (length(btrim("reason")) > 0),
 "previousState" JSONB NOT NULL, "newState" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AdminAuditLog_createdAt_id_idx" ON "AdminAuditLog"("createdAt", "id");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
-- No routine API may modify these records. This also protects against accidental application updates.
CREATE FUNCTION prevent_admin_audit_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Administrative audit records are immutable'; END $$;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_rewrite();
