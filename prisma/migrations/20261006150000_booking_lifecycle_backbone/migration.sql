BEGIN;

CREATE TYPE "ListingType" AS ENUM ('RENTAL', 'SERVICE');
CREATE TYPE "BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'HANDOFF_PENDING',
    'IN_USE',
    'RETURN_PENDING',
    'INSPECTION',
    'COMPLETED',
    'DISPUTED',
    'CANCELLED'
);

ALTER TABLE "User"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

ALTER TABLE "Listing" RENAME COLUMN "pricePerDay" TO "price";
ALTER TABLE "Listing" RENAME COLUMN "depositAmount" TO "deposit";
ALTER TABLE "Listing" ALTER COLUMN "deposit" DROP NOT NULL;
ALTER TABLE "Listing"
ADD COLUMN "type" "ListingType" NOT NULL DEFAULT 'RENTAL';

CREATE TABLE "MrtStation" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MrtStation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MrtStation_code_key" ON "MrtStation"("code");
CREATE UNIQUE INDEX "MrtStation_name_key" ON "MrtStation"("name");

INSERT INTO "MrtStation" ("code", "name")
VALUES ('TPE', 'Taipei Main Station');

CREATE TABLE "ListingStation" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    CONSTRAINT "ListingStation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListingStation_listingId_stationId_key"
ON "ListingStation"("listingId", "stationId");
INSERT INTO "ListingStation" ("listingId", "stationId")
SELECT listing."id", station."id"
FROM "Listing" AS listing
CROSS JOIN "MrtStation" AS station
WHERE station."code" = 'TPE';
ALTER TABLE "ListingStation"
ADD CONSTRAINT "ListingStation_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingStation"
ADD CONSTRAINT "ListingStation_stationId_fkey"
FOREIGN KEY ("stationId") REFERENCES "MrtStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "renterId" INTEGER NOT NULL,
    "meetingStationId" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "deposit" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Booking" (
    "id", "listingId", "ownerId", "renterId", "meetingStationId",
    "startAt", "endAt", "status", "totalPrice", "deposit", "notes",
    "createdAt", "updatedAt"
)
SELECT
    request."id",
    request."listingId",
    listing."ownerId",
    request."borrowerId",
    station."id",
    request."startDate",
    request."endDate",
    CASE
        WHEN legacy_transaction."status"::TEXT = 'DISPUTED'
          OR EXISTS (
              SELECT 1 FROM "Dispute" AS legacy_dispute
              WHERE legacy_dispute."transactionId" = legacy_transaction."id"
          ) THEN 'DISPUTED'::"BookingStatus"
                WHEN legacy_transaction."status"::TEXT = 'COMPLETED'
                    THEN 'COMPLETED'::"BookingStatus"
                WHEN legacy_transaction."status"::TEXT = 'INSPECTION'
                    THEN 'INSPECTION'::"BookingStatus"
        WHEN legacy_transaction."status"::TEXT = 'RETURN_PENDING'
          THEN 'RETURN_PENDING'::"BookingStatus"
                WHEN legacy_transaction."status"::TEXT = 'HANDOFF_PENDING'
                    AND EXISTS (
                            SELECT 1
                            FROM "Handoff" AS legacy_handoff
                            WHERE legacy_handoff."transactionId" = legacy_transaction."id"
                                AND legacy_handoff."type"::TEXT = 'BORROW'
                    ) THEN 'HANDOFF_PENDING'::"BookingStatus"
                WHEN legacy_transaction."status"::TEXT = 'IN_USE'
                    AND EXISTS (
                            SELECT 1
                            FROM "Handoff" AS legacy_handoff
                            WHERE legacy_handoff."transactionId" = legacy_transaction."id"
                                AND legacy_handoff."type"::TEXT = 'BORROW'
                    ) THEN 'IN_USE'::"BookingStatus"
                WHEN legacy_transaction."status"::TEXT IN ('HANDOFF_PENDING', 'IN_USE')
                    THEN 'CONFIRMED'::"BookingStatus"
        WHEN EXISTS (
            SELECT 1
            FROM "Handoff" AS legacy_handoff
            WHERE legacy_handoff."transactionId" = legacy_transaction."id"
              AND legacy_handoff."type"::TEXT = 'BORROW'
        ) THEN 'HANDOFF_PENDING'::"BookingStatus"
        WHEN request."status"::TEXT = 'ACCEPTED' THEN 'CONFIRMED'::"BookingStatus"
        WHEN request."status"::TEXT = 'PENDING' THEN 'PENDING'::"BookingStatus"
        ELSE 'CANCELLED'::"BookingStatus"
    END,
    (
        listing."price" * GREATEST(
            1,
            CEIL(EXTRACT(EPOCH FROM (request."endDate" - request."startDate")) / 86400)::INTEGER
        )
    )::DECIMAL(12,2),
    listing."deposit",
    NULL,
    request."createdAt",
    COALESCE(legacy_transaction."updatedAt", request."createdAt")
FROM "RentalRequest" AS request
JOIN "Listing" AS listing ON listing."id" = request."listingId"
CROSS JOIN "MrtStation" AS station
LEFT JOIN "Transaction" AS legacy_transaction
    ON legacy_transaction."rentalRequestId" = request."id"
WHERE station."code" = 'TPE';

SELECT setval(
    pg_get_serial_sequence('"Booking"', 'id'),
    COALESCE(MAX("id"), 1),
    COUNT(*) > 0
)
FROM "Booking";

CREATE INDEX "Booking_listingId_status_idx" ON "Booking"("listingId", "status");
CREATE INDEX "Booking_listingId_status_startAt_endAt_idx"
ON "Booking"("listingId", "status", "startAt", "endAt");
CREATE INDEX "Booking_ownerId_status_idx" ON "Booking"("ownerId", "status");
CREATE INDEX "Booking_renterId_status_idx" ON "Booking"("renterId", "status");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_renterId_fkey"
FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_meetingStationId_fkey"
FOREIGN KEY ("meetingStationId") REFERENCES "MrtStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Handoff" RENAME TO "LegacyHandoff";
ALTER TABLE "LegacyHandoff" RENAME CONSTRAINT "Handoff_pkey" TO "LegacyHandoff_pkey";
ALTER INDEX "Handoff_transactionId_type_key"
RENAME TO "LegacyHandoff_transactionId_type_key";
ALTER TABLE "LegacyHandoff" RENAME CONSTRAINT "Handoff_transactionId_fkey"
TO "LegacyHandoff_transactionId_fkey";
ALTER TABLE "LegacyHandoff" RENAME CONSTRAINT "Handoff_performedBy_fkey"
TO "LegacyHandoff_performedBy_fkey";

CREATE TABLE "Handoff" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "confirmedBy" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "serialNumber" TEXT,
    "conditionNotes" TEXT,
    "conditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Handoff_bookingId_key" ON "Handoff"("bookingId");
INSERT INTO "Handoff" (
    "bookingId", "performedBy", "confirmedBy", "timestamp", "confirmedAt",
    "serialNumber", "conditionNotes", "conditionConfirmed", "createdAt", "updatedAt"
)
SELECT
    request."id",
    legacy_handoff."performedBy",
    CASE
        WHEN legacy_transaction."status"::TEXT IN ('IN_USE', 'RETURN_PENDING', 'INSPECTION', 'COMPLETED', 'DISPUTED')
          THEN CASE
              WHEN legacy_handoff."performedBy" = legacy_transaction."ownerId"
                THEN legacy_transaction."borrowerId"
              ELSE legacy_transaction."ownerId"
          END
        ELSE NULL
    END,
    legacy_handoff."timestamp",
    CASE
        WHEN legacy_transaction."status"::TEXT IN ('IN_USE', 'RETURN_PENDING', 'INSPECTION', 'COMPLETED', 'DISPUTED')
          THEN legacy_handoff."timestamp"
        ELSE NULL
    END,
    legacy_handoff."serialNumber", legacy_handoff."conditionNotes",
    legacy_handoff."conditionConfirmed" OR legacy_transaction."status"::TEXT IN ('IN_USE', 'RETURN_PENDING', 'INSPECTION', 'COMPLETED', 'DISPUTED'),
    legacy_handoff."createdAt", legacy_handoff."updatedAt"
FROM "LegacyHandoff" AS legacy_handoff
JOIN "Transaction" AS legacy_transaction
    ON legacy_transaction."id" = legacy_handoff."transactionId"
JOIN "RentalRequest" AS request
    ON request."id" = legacy_transaction."rentalRequestId"
WHERE legacy_handoff."type"::TEXT = 'BORROW';

CREATE TABLE "Return" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "initiatedBy" INTEGER NOT NULL,
    "confirmedBy" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "conditionNotes" TEXT,
    "conditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Return_bookingId_key" ON "Return"("bookingId");
INSERT INTO "Return" (
    "bookingId", "initiatedBy", "confirmedBy", "timestamp", "confirmedAt",
    "conditionNotes", "conditionConfirmed", "createdAt", "updatedAt"
)
SELECT
    request."id",
    request."borrowerId",
    CASE WHEN legacy_transaction."status"::TEXT = 'COMPLETED' THEN legacy_transaction."ownerId" ELSE NULL END,
    COALESCE(return_handoff."timestamp", legacy_transaction."returnedAt", CURRENT_TIMESTAMP),
    CASE
        WHEN legacy_transaction."status"::TEXT = 'COMPLETED'
          THEN COALESCE(legacy_transaction."completedAt", return_handoff."timestamp", legacy_transaction."returnedAt")
        ELSE NULL
    END,
    return_handoff."conditionNotes",
    COALESCE(return_handoff."conditionConfirmed", false) OR legacy_transaction."status"::TEXT = 'COMPLETED',
    COALESCE(return_handoff."createdAt", legacy_transaction."createdAt"),
    COALESCE(return_handoff."updatedAt", legacy_transaction."updatedAt")
FROM "Transaction" AS legacy_transaction
JOIN "RentalRequest" AS request
    ON request."id" = legacy_transaction."rentalRequestId"
LEFT JOIN "LegacyHandoff" AS return_handoff
    ON return_handoff."transactionId" = legacy_transaction."id"
   AND return_handoff."type"::TEXT = 'RETURN'
WHERE return_handoff."id" IS NOT NULL
   OR legacy_transaction."returnedAt" IS NOT NULL
   OR legacy_transaction."status"::TEXT IN ('RETURN_PENDING', 'INSPECTION', 'COMPLETED');

ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_transactionId_fkey";
ALTER TABLE "Dispute" RENAME COLUMN "transactionId" TO "legacyTransactionId";
ALTER TABLE "Dispute" ADD COLUMN "bookingId" INTEGER;
UPDATE "Dispute" AS legacy_dispute
SET "bookingId" = request."id"
FROM "Transaction" AS legacy_transaction
JOIN "RentalRequest" AS request
    ON request."id" = legacy_transaction."rentalRequestId"
WHERE legacy_dispute."legacyTransactionId" = legacy_transaction."id";
DELETE FROM "Dispute" WHERE "bookingId" IS NULL;
DELETE FROM "Dispute" AS duplicate
USING (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "bookingId"
            ORDER BY ("status"::TEXT = 'OPEN') DESC, "createdAt" DESC, "id" DESC
        ) AS duplicate_rank
    FROM "Dispute"
) AS ranked
WHERE duplicate."id" = ranked."id"
  AND ranked.duplicate_rank > 1;
ALTER TABLE "Dispute" ALTER COLUMN "bookingId" SET NOT NULL;
ALTER TABLE "Dispute" DROP COLUMN "legacyTransactionId";

INSERT INTO "Dispute" (
    "bookingId", "openedBy", "reason", "description", "status", "createdAt", "resolvedAt"
)
SELECT
    booking."id", booking."renterId", 'Legacy dispute',
    'Migrated from a disputed legacy transaction.', 'OPEN'::"DisputeStatus",
    booking."updatedAt", NULL
FROM "Booking" AS booking
JOIN "Transaction" AS legacy_transaction
    ON legacy_transaction."rentalRequestId" = booking."id"
WHERE legacy_transaction."status"::TEXT = 'DISPUTED'
  AND NOT EXISTS (
      SELECT 1 FROM "Dispute" AS dispute WHERE dispute."bookingId" = booking."id"
  );

CREATE UNIQUE INDEX "Dispute_bookingId_key" ON "Dispute"("bookingId");
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

ALTER TABLE "Handoff"
ADD CONSTRAINT "Handoff_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Handoff"
ADD CONSTRAINT "Handoff_performedBy_fkey"
FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handoff"
ADD CONSTRAINT "Handoff_confirmedBy_fkey"
FOREIGN KEY ("confirmedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Return"
ADD CONSTRAINT "Return_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Return"
ADD CONSTRAINT "Return_initiatedBy_fkey"
FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Return"
ADD CONSTRAINT "Return_confirmedBy_fkey"
FOREIGN KEY ("confirmedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "LegacyHandoff";
DROP TABLE "Transaction";
DROP TABLE "RentalRequest";

DROP TYPE "HandoffType";
DROP TYPE "TransactionType";
DROP TYPE "TransactionStatus";
DROP TYPE "RequestStatus";

COMMIT;