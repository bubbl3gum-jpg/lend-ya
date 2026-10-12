BEGIN;

ALTER TABLE "Listing"
ADD COLUMN "categoryDetails" JSONB;

UPDATE "Listing"
SET "status" = 'INACTIVE'
WHERE "type"::TEXT = 'SERVICE';

ALTER TABLE "Listing" DROP COLUMN "type";
DROP TYPE "ListingType";

CREATE TYPE "ListingMediaKind" AS ENUM ('PHOTO', 'VIDEO');
CREATE TYPE "ListingReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

CREATE TABLE "ListingMedia" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "ListingMediaKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingMedia_listingId_createdAt_idx"
ON "ListingMedia"("listingId", "createdAt");
ALTER TABLE "ListingMedia"
ADD CONSTRAINT "ListingMedia_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ListingReport" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ListingReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListingReport_listingId_reporterId_key"
ON "ListingReport"("listingId", "reporterId");
CREATE INDEX "ListingReport_status_createdAt_idx"
ON "ListingReport"("status", "createdAt");
ALTER TABLE "ListingReport"
ADD CONSTRAINT "ListingReport_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingReport"
ADD CONSTRAINT "ListingReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;