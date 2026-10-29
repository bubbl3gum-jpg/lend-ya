BEGIN;
-- CreateTable
CREATE TABLE "DevConditionClaim" (
    "disputeId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "original" JSONB NOT NULL,
    "requestKey" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "returnedAt" TIMESTAMPTZ(3) NOT NULL,
    "inspectionDeadline" TIMESTAMPTZ(3) NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    "agreementContextId" UUID,
    "policy" VARCHAR(40) NOT NULL DEFAULT 'owned-condition-claim-v1',
    "revision" INTEGER NOT NULL,

    CONSTRAINT "DevConditionClaim_pkey" PRIMARY KEY ("disputeId")
);

-- CreateTable
CREATE TABLE "DevConditionEvent" (
    "id" UUID NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,
    "requestKey" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "DevConditionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevConditionNotice" (
    "disputeId" INTEGER NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "DevConditionNotice_pkey" PRIMARY KEY ("disputeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevConditionClaim_bookingId_key" ON "DevConditionClaim"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "DevConditionClaim_requestKey_key" ON "DevConditionClaim"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "DevConditionEvent_disputeId_revision_key" ON "DevConditionEvent"("disputeId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "DevConditionEvent_disputeId_actorId_requestKey_key" ON "DevConditionEvent"("disputeId", "actorId", "requestKey");

-- AddForeignKey
ALTER TABLE "DevConditionClaim" ADD CONSTRAINT "DevConditionClaim_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionClaim" ADD CONSTRAINT "DevConditionClaim_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionClaim" ADD CONSTRAINT "DevConditionClaim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionClaim" ADD CONSTRAINT "DevConditionClaim_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionClaim" ADD CONSTRAINT "DevConditionClaim_agreementContextId_fkey" FOREIGN KEY ("agreementContextId") REFERENCES "DevDocReviewContext"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionEvent" ADD CONSTRAINT "DevConditionEvent_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevConditionClaim"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionEvent" ADD CONSTRAINT "DevConditionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionNotice" ADD CONSTRAINT "DevConditionNotice_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevConditionClaim"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevConditionNotice" ADD CONSTRAINT "DevConditionNotice_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "DevConditionClaim" ADD CHECK(revision BETWEEN 3 AND 100),ADD CHECK(policy='owned-condition-claim-v1'),ADD CHECK("requestHash" ~ '^[a-f0-9]{64}$'),ADD CHECK(jsonb_typeof(original)='object' AND octet_length(original::text)<12000);
ALTER TABLE "DevConditionEvent" ADD CHECK(revision BETWEEN 1 AND 100),ADD CHECK("requestHash" ~ '^[a-f0-9]{64}$'),ADD CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<12000),ADD CHECK(kind IN ('CLAIM_SUBMITTED','NOTICE_CREATED','NOTICE_QUEUED','NOTICE_VIEWED','OWNER_SUPPLEMENT','BORROWER_RESPONSE','BORROWER_CLARIFICATION','TEST_DELIVERED','DELIVERY_FAILED','DELIVERY_UNAVAILABLE'));
CREATE FUNCTION hustlen_claim_actor() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE a integer;sid integer;marker text;
BEGIN
 SELECT shobj_description(oid,'pg_database') INTO marker FROM pg_database WHERE datname=current_database();
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR coalesce(marker,'') !~ '^hustlen-mrt-test:[a-f0-9]{24}$' OR current_setting('hustlen.claim_pilot',true) IS DISTINCT FROM 'owned-dispute-only' THEN RAISE EXCEPTION 'Owned condition claim gate required';END IF;
 a:=nullif(current_setting('hustlen.claim_actor',true),'')::integer;sid:=nullif(current_setting('hustlen.claim_session',true),'')::integer;
 IF a IS NULL OR NOT EXISTS(SELECT 1 FROM "AuthSession" s JOIN "User" u ON u.id=s."userId" WHERE s.id=sid AND s."userId"=a AND s."expiresAt">clock_timestamp() AND u."accountStatus" IN ('ACTIVE','SUSPENDED')) THEN RAISE EXCEPTION 'Current claim actor required';END IF;RETURN a;
END $$;
CREATE FUNCTION hustlen_condition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a integer;c "DevConditionClaim";b "Booking";d "Dispute";at timestamptz;receipt "MeetupEvent";
BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND TG_TABLE_NAME<>'DevConditionClaim') THEN RAISE EXCEPTION 'Condition history immutable';END IF;
 a:=hustlen_claim_actor();
 IF TG_TABLE_NAME='DevConditionClaim' THEN
  IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-'revision') IS DISTINCT FROM (to_jsonb(OLD)-'revision') OR NEW.revision<>OLD.revision+1 OR a NOT IN(OLD."ownerId",OLD."borrowerId") THEN RAISE EXCEPTION 'Immutable allegation or revision conflict';END IF;RETURN NEW;
  END IF;
  SELECT * INTO b FROM "Booking" WHERE id=NEW."bookingId";SELECT * INTO d FROM "Dispute" WHERE id=NEW."disputeId";
  IF b.id IS NULL OR d.id IS NULL OR d."bookingId"<>b.id OR d."openedBy"<>a OR a<>b."ownerId" OR NEW."ownerId"<>a OR NEW."borrowerId"<>b."renterId" OR d.status<>'OPEN' OR b.status<>'DISPUTED' OR NEW.revision<>3 OR NOT EXISTS(SELECT 1 FROM "User" WHERE id=a AND "accountStatus"='ACTIVE') THEN RAISE EXCEPTION 'Actual owner dispute required';END IF;
  SELECT * INTO receipt FROM "MeetupEvent" WHERE "bookingId"=b.id AND purpose='RETURN' AND kind='PHYSICAL_RECEIPT_ACK' AND "actorId"=b."ownerId" AND "challengeId" IS NOT NULL ORDER BY "createdAt" ASC LIMIT 1;
  SELECT x."completedAt" AT TIME ZONE 'UTC' INTO at FROM "MeetupChallenge" x JOIN "Handoff" h ON h."bookingId"=b.id JOIN "Return" r ON r."bookingId"=b.id WHERE x.id=receipt."challengeId" AND x."bookingId"=b.id AND x.purpose='RETURN' AND x."verifierId"=b."ownerId" AND x."issuerId"=b."renterId" AND x."consumedAt" IS NOT NULL AND x."completedAt" IS NOT NULL AND x."completionHash" IS NOT NULL AND h."performedBy"=b."ownerId" AND h."confirmedBy"=b."renterId" AND h."conditionConfirmed" AND h."ownerConditionConfirmed" AND r."initiatedBy"=b."renterId" AND r."returnConfirmed";
  IF at IS NULL OR at>clock_timestamp() OR clock_timestamp()>=at+interval '24 hours' THEN RAISE EXCEPTION 'Verified return inspection window required';END IF;
  IF NEW.original->>'description' IS DISTINCT FROM d.description OR NEW.original->>'concern' IS DISTINCT FROM d.reason THEN RAISE EXCEPTION 'Original dispute allegation mismatch';END IF;
  IF NEW."agreementContextId" IS DISTINCT FROM (CASE WHEN b."documentationAcceptedAt" IS NOT NULL THEN b."documentationContextId" ELSE NULL END) THEN RAISE EXCEPTION 'Agreed documentation mismatch';END IF;
  NEW."returnedAt":=at;NEW."inspectionDeadline":=at+interval '24 hours';NEW."submittedAt":=clock_timestamp();RETURN NEW;
 END IF;
 SELECT * INTO c FROM "DevConditionClaim" WHERE "disputeId"=NEW."disputeId";
 IF c."disputeId" IS NULL OR a NOT IN(c."ownerId",c."borrowerId") THEN RAISE EXCEPTION 'Case participant required';END IF;
 IF TG_TABLE_NAME='DevConditionNotice' THEN
  IF a<>c."ownerId" OR NEW."borrowerId"<>c."borrowerId" THEN RAISE EXCEPTION 'Actual recipient required';END IF;
 ELSE
  IF NEW."actorId"<>a THEN RAISE EXCEPTION 'Event attribution mismatch';END IF;
  IF NEW.kind IN ('CLAIM_SUBMITTED','NOTICE_CREATED','NOTICE_QUEUED','OWNER_SUPPLEMENT') AND a<>c."ownerId" THEN RAISE EXCEPTION 'Owner event required';END IF;
  IF NEW.kind IN ('NOTICE_VIEWED','BORROWER_RESPONSE','BORROWER_CLARIFICATION') AND a<>c."borrowerId" THEN RAISE EXCEPTION 'Borrower event required';END IF;
  IF NEW.kind='OWNER_SUPPLEMENT' AND clock_timestamp()>=c."inspectionDeadline" THEN RAISE EXCEPTION 'Owner supplement window closed';END IF;
  IF NEW.kind='CLAIM_SUBMITTED' AND (NEW.revision<>1 OR NEW.payload IS DISTINCT FROM c.original) THEN RAISE EXCEPTION 'Original allegation event required';END IF;
  IF NEW.kind IN ('TEST_DELIVERED','DELIVERY_FAILED','DELIVERY_UNAVAILABLE') AND (current_setting('hustlen.claim_test_delivery',true) IS DISTINCT FROM 'synthetic-fixture-only' OR NEW.payload->>'source' IS DISTINCT FROM 'SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF') THEN RAISE EXCEPTION 'Trusted fixture delivery required';END IF;
 END IF;
 NEW."createdAt":=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER condition_claim_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevConditionClaim" FOR EACH ROW EXECUTE FUNCTION hustlen_condition_guard();
CREATE TRIGGER condition_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevConditionEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_condition_guard();
CREATE TRIGGER condition_notice_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevConditionNotice" FOR EACH ROW EXECUTE FUNCTION hustlen_condition_guard();
CREATE UNIQUE INDEX condition_one_original_response ON "DevConditionEvent"("disputeId") WHERE kind='BORROWER_RESPONSE';
CREATE FUNCTION hustlen_condition_atomic() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c "DevConditionClaim";n integer;v integer;
BEGIN
 SELECT * INTO c FROM "DevConditionClaim" WHERE "disputeId"=NEW."disputeId";
 SELECT count(*),max(revision) INTO n,v FROM "DevConditionEvent" WHERE "disputeId"=NEW."disputeId";
 IF c."disputeId" IS NULL OR n<>c.revision OR v<>c.revision OR NOT EXISTS(SELECT 1 FROM "DevConditionNotice" WHERE "disputeId"=c."disputeId" AND "borrowerId"=c."borrowerId") OR NOT EXISTS(SELECT 1 FROM "DevConditionEvent" WHERE "disputeId"=c."disputeId" AND revision=1 AND kind='CLAIM_SUBMITTED') OR NOT EXISTS(SELECT 1 FROM "DevConditionEvent" WHERE "disputeId"=c."disputeId" AND revision=2 AND kind='NOTICE_CREATED') OR NOT EXISTS(SELECT 1 FROM "DevConditionEvent" WHERE "disputeId"=c."disputeId" AND revision=3 AND kind='NOTICE_QUEUED') THEN RAISE EXCEPTION 'Atomic claim notification and event history required';END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER condition_claim_atomic AFTER INSERT OR UPDATE ON "DevConditionClaim" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_condition_atomic();
CREATE CONSTRAINT TRIGGER condition_event_atomic AFTER INSERT ON "DevConditionEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_condition_atomic();
CREATE CONSTRAINT TRIGGER condition_notice_atomic AFTER INSERT ON "DevConditionNotice" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_condition_atomic();
CREATE TRIGGER condition_claim_no_truncate BEFORE TRUNCATE ON "DevConditionClaim" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER condition_event_no_truncate BEFORE TRUNCATE ON "DevConditionEvent" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER condition_notice_no_truncate BEFORE TRUNCATE ON "DevConditionNotice" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE FUNCTION hustlen_preserve_structured_dispute() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "DevConditionClaim" WHERE "disputeId"=OLD.id) AND ROW(NEW."bookingId",NEW."openedBy",NEW.reason,NEW.description,NEW."createdAt") IS DISTINCT FROM ROW(OLD."bookingId",OLD."openedBy",OLD.reason,OLD.description,OLD."createdAt") THEN RAISE EXCEPTION 'Original structured dispute immutable';END IF;RETURN NEW;
END $$;
CREATE TRIGGER preserve_structured_dispute BEFORE UPDATE ON "Dispute" FOR EACH ROW EXECUTE FUNCTION hustlen_preserve_structured_dispute();
COMMIT;
