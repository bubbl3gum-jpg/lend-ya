BEGIN;
CREATE TABLE "DevDocSelectionEvent" (
 id uuid PRIMARY KEY,"listingId" integer NOT NULL REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 200),
 "versionId" uuid REFERENCES "DevItemVersion"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 title varchar(200) NOT NULL,digest char(64),"createdAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 CHECK(("versionId" IS NULL AND digest IS NULL) OR ("versionId" IS NOT NULL AND digest IS NOT NULL AND digest ~ '^[a-f0-9]{64}$')),
 CONSTRAINT "DevDocSelectionEvent_listingId_revision_key" UNIQUE("listingId",revision)
);
CREATE TABLE "DevDocSelection" (
 "listingId" integer PRIMARY KEY REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 200),
 "eventId" uuid NOT NULL REFERENCES "DevDocSelectionEvent"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 CONSTRAINT "DevDocSelection_eventId_key" UNIQUE("eventId")
);
CREATE TABLE "DevDocReviewContext" (
 id uuid PRIMARY KEY,"listingId" integer NOT NULL REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "borrowerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,"sessionId" integer NOT NULL,
 "selectionEventId" uuid NOT NULL REFERENCES "DevDocSelectionEvent"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 terms jsonb NOT NULL CHECK(jsonb_typeof(terms)='object' AND octet_length(terms::text)<8192),
 "termsDigest" char(64) NOT NULL CHECK("termsDigest" ~ '^[a-f0-9]{64}$'),
 policy varchar(48) NOT NULL DEFAULT 'owned-documentation-agreement-v1' CHECK(policy='owned-documentation-agreement-v1'),
 "createdAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp(),"expiresAt" timestamptz(3) NOT NULL DEFAULT(clock_timestamp()+interval '10 minutes')
);
CREATE INDEX "DevDocReviewContext_borrowerId_createdAt_idx" ON "DevDocReviewContext"("borrowerId","createdAt");
ALTER TABLE "Booking" ADD COLUMN "documentationContextId" uuid REFERENCES "DevDocReviewContext"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 ADD COLUMN "documentationAcknowledgedAt" timestamptz(3),ADD COLUMN "documentationAcceptedAt" timestamptz(3);
CREATE UNIQUE INDEX "Booking_documentationContextId_key" ON "Booking"("documentationContextId");
CREATE FUNCTION hustlen_doc_gate() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE actor integer; sid integer; marker text;
BEGIN
 SELECT shobj_description(oid,'pg_database') INTO marker FROM pg_database WHERE datname=current_database();
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR coalesce(marker,'') !~ '^hustlen-mrt-test:[a-f0-9]{24}$' OR current_setting('hustlen.doc_pilot',true) IS DISTINCT FROM 'owned-agreement-only' THEN RAISE EXCEPTION 'Owned agreement gate required'; END IF;
 actor:=nullif(current_setting('hustlen.doc_actor',true),'')::integer;sid:=nullif(current_setting('hustlen.doc_session',true),'')::integer;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM "AuthSession" s JOIN "User" u ON u.id=s."userId" WHERE s.id=sid AND u.id=actor AND u."accountStatus"='ACTIVE' AND s."expiresAt">clock_timestamp()) THEN RAISE EXCEPTION 'Current active agreement actor required'; END IF;
 RETURN actor;
END $$;
CREATE FUNCTION hustlen_doc_metadata_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor integer; e "DevDocSelectionEvent";
BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND TG_TABLE_NAME<>'DevDocSelection') THEN RAISE EXCEPTION 'Agreement documentation history immutable'; END IF;
 actor:=hustlen_doc_gate();
 IF TG_TABLE_NAME='DevDocReviewContext' THEN
  IF NEW."borrowerId"<>actor OR NEW."sessionId"<>nullif(current_setting('hustlen.doc_session',true),'')::integer THEN RAISE EXCEPTION 'Borrower mismatch'; END IF;
  SELECT * INTO e FROM "DevDocSelectionEvent" WHERE id=NEW."selectionEventId";
  IF e.id IS NULL OR e."listingId"<>NEW."listingId" OR e."versionId" IS NULL OR NOT EXISTS(SELECT 1 FROM "DevDocSelection" WHERE "listingId"=NEW."listingId" AND "eventId"=e.id) THEN RAISE EXCEPTION 'Stale designation'; END IF;
  NEW."createdAt":=clock_timestamp();NEW."expiresAt":=clock_timestamp()+interval '10 minutes';
 ELSE
  IF NEW."ownerId"<>actor OR NOT EXISTS(SELECT 1 FROM "Listing" WHERE id=NEW."listingId" AND "ownerId"=actor) THEN RAISE EXCEPTION 'Owner required'; END IF;
  IF TG_TABLE_NAME='DevDocSelection' THEN
   IF TG_OP='UPDATE' AND (NEW."listingId"<>OLD."listingId" OR NEW."ownerId"<>OLD."ownerId" OR NEW.revision<>OLD.revision+1) THEN RAISE EXCEPTION 'Revision conflict'; END IF;
   IF TG_OP='INSERT' AND NEW.revision<>1 THEN RAISE EXCEPTION 'Initial revision required'; END IF;
  ELSE
   IF NEW."versionId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "DevItemVersion" WHERE id=NEW."versionId" AND "ownerId"=actor AND "listingId"=NEW."listingId") THEN RAISE EXCEPTION 'Foreign version'; END IF;
   NEW."createdAt":=clock_timestamp();
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER doc_selection_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevDocSelection" FOR EACH ROW EXECUTE FUNCTION hustlen_doc_metadata_guard();
CREATE TRIGGER doc_selection_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevDocSelectionEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_doc_metadata_guard();
CREATE TRIGGER doc_context_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevDocReviewContext" FOR EACH ROW EXECUTE FUNCTION hustlen_doc_metadata_guard();
CREATE FUNCTION hustlen_doc_selection_atomic() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p "DevDocSelection";e "DevDocSelectionEvent";
BEGIN
 SELECT * INTO p FROM "DevDocSelection" WHERE "listingId"=NEW."listingId";
 SELECT * INTO e FROM "DevDocSelectionEvent" WHERE id=p."eventId";
 IF p."listingId" IS NULL OR e.id IS NULL OR e.revision<>p.revision OR e."ownerId"<>p."ownerId" OR e."listingId"<>p."listingId" THEN RAISE EXCEPTION 'Atomic designation event required'; END IF;
 IF TG_TABLE_NAME='DevDocSelectionEvent' THEN IF NEW.id<>e.id THEN RAISE EXCEPTION 'Unbound designation event'; END IF;END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER doc_selection_atomic AFTER INSERT OR UPDATE ON "DevDocSelection" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_doc_selection_atomic();
CREATE CONSTRAINT TRIGGER doc_selection_event_atomic AFTER INSERT ON "DevDocSelectionEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_doc_selection_atomic();
CREATE TRIGGER doc_selection_no_truncate BEFORE TRUNCATE ON "DevDocSelection" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER doc_event_no_truncate BEFORE TRUNCATE ON "DevDocSelectionEvent" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER doc_context_no_truncate BEFORE TRUNCATE ON "DevDocReviewContext" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE FUNCTION hustlen_booking_documentation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c "DevDocReviewContext";e "DevDocSelectionEvent"; actor integer;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW."documentationContextId" IS DISTINCT FROM OLD."documentationContextId" OR NEW."documentationAcknowledgedAt" IS DISTINCT FROM OLD."documentationAcknowledgedAt" THEN RAISE EXCEPTION 'Request acknowledgement immutable; no backfill'; END IF;
  IF OLD."documentationContextId" IS NULL THEN IF NEW."documentationAcceptedAt" IS NOT NULL THEN RAISE EXCEPTION 'Legacy acceptance has no invented documentation'; END IF;RETURN NEW; END IF;
  IF ROW(NEW."listingId",NEW."ownerId",NEW."renterId",NEW."startAt",NEW."endAt",NEW."meetingStationId",NEW."dailyPrice",NEW."totalPrice",NEW.deposit,NEW.notes,NEW."requestKey",NEW."requestHash") IS DISTINCT FROM ROW(OLD."listingId",OLD."ownerId",OLD."renterId",OLD."startAt",OLD."endAt",OLD."meetingStationId",OLD."dailyPrice",OLD."totalPrice",OLD.deposit,OLD.notes,OLD."requestKey",OLD."requestHash") THEN RAISE EXCEPTION 'Documented booking terms immutable'; END IF;
  IF OLD."documentationAcceptedAt" IS NOT NULL THEN IF NEW."documentationAcceptedAt" IS DISTINCT FROM OLD."documentationAcceptedAt" THEN RAISE EXCEPTION 'Owner acceptance immutable';END IF;RETURN NEW;END IF;
  IF OLD.status='PENDING' AND NEW.status='CONFIRMED' THEN
   actor:=hustlen_doc_gate();IF actor<>OLD."ownerId" THEN RAISE EXCEPTION 'Actual owner acceptance required';END IF;
   SELECT * INTO c FROM "DevDocReviewContext" WHERE id=OLD."documentationContextId";
   IF NOT EXISTS(SELECT 1 FROM "DevDocSelection" WHERE "listingId"=OLD."listingId" AND "eventId"=c."selectionEventId") THEN RAISE EXCEPTION 'Documentation changed; renewed borrower review required'; END IF;
   NEW."documentationAcceptedAt":=clock_timestamp();
  ELSIF OLD.status='PENDING' AND NEW.status NOT IN ('PENDING','CANCELLED') THEN RAISE EXCEPTION 'Owner acceptance required before rental progression';
  ELSIF NEW."documentationAcceptedAt" IS NOT NULL THEN RAISE EXCEPTION 'Acceptance only at pending to confirmed transition'; END IF;
  RETURN NEW;
 END IF;
 IF NEW."documentationContextId" IS NULL THEN IF NEW."documentationAcknowledgedAt" IS NOT NULL OR NEW."documentationAcceptedAt" IS NOT NULL THEN RAISE EXCEPTION 'No invented legacy acknowledgement';END IF;RETURN NEW;END IF;
 actor:=hustlen_doc_gate();SELECT * INTO c FROM "DevDocReviewContext" WHERE id=NEW."documentationContextId";SELECT * INTO e FROM "DevDocSelectionEvent" WHERE id=c."selectionEventId";
 IF c.id IS NULL OR c."borrowerId"<>actor OR NEW."renterId"<>actor OR c."sessionId"<>nullif(current_setting('hustlen.doc_session',true),'')::integer OR c."listingId"<>NEW."listingId" OR e."ownerId"<>NEW."ownerId" OR c."expiresAt"<=clock_timestamp() OR NEW.status<>'PENDING' OR NEW."documentationAcceptedAt" IS NOT NULL OR NOT EXISTS(SELECT 1 FROM "DevDocSelection" WHERE "listingId"=NEW."listingId" AND "eventId"=e.id) THEN RAISE EXCEPTION 'Invalid request review context'; END IF;
 IF (c.terms->>'startAt')::timestamptz AT TIME ZONE 'UTC' <> NEW."startAt" OR (c.terms->>'endAt')::timestamptz AT TIME ZONE 'UTC' <> NEW."endAt" OR (c.terms->>'stationId')::integer<>NEW."meetingStationId" OR (c.terms->>'dailyPrice')::numeric<>NEW."dailyPrice" OR (c.terms->>'totalPrice')::numeric<>NEW."totalPrice" OR (c.terms->>'deposit')::numeric IS DISTINCT FROM NEW.deposit OR c.terms->>'notes' IS DISTINCT FROM NEW.notes THEN RAISE EXCEPTION 'Reviewed terms mismatch';END IF;
 NEW."documentationAcknowledgedAt":=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER booking_documentation_guard BEFORE INSERT OR UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION hustlen_booking_documentation_guard();
CREATE FUNCTION hustlen_documented_booking_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='TRUNCATE' THEN IF EXISTS(SELECT 1 FROM "Booking" WHERE "documentationContextId" IS NOT NULL) THEN RAISE EXCEPTION 'Documented agreements cannot be truncated';END IF;RETURN NULL;END IF;
 IF OLD."documentationContextId" IS NOT NULL THEN RAISE EXCEPTION 'Documented agreement acknowledgement cannot be deleted';END IF;RETURN OLD;
END $$;
CREATE TRIGGER documented_booking_no_delete BEFORE DELETE ON "Booking" FOR EACH ROW EXECUTE FUNCTION hustlen_documented_booking_no_delete();
CREATE TRIGGER documented_booking_no_truncate BEFORE TRUNCATE ON "Booking" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_documented_booking_no_delete();
COMMIT;
