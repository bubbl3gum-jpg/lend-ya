BEGIN;
-- Additive candidate tables only. No backfill or modification of historical rows.
CREATE TABLE "DevItemDraft" (
 "listingId" integer PRIMARY KEY REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 200), category varchar(64) NOT NULL,
 checklist jsonb NOT NULL CHECK(jsonb_typeof(checklist)='object' AND octet_length(checklist::text)<8192),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<16384),
 "createdAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp(), "updatedAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE "DevItemPhoto" (
 id uuid PRIMARY KEY, "listingId" integer NOT NULL REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 200), "areaId" varchar(40) NOT NULL,
 "mimeType" varchar(32) NOT NULL CHECK("mimeType" IN ('image/jpeg','image/png','image/webp')),
 data bytea NOT NULL CHECK(octet_length(data) BETWEEN 1 AND 5242880),
 "inputHash" char(64) NOT NULL CHECK("inputHash" ~ '^[a-f0-9]{64}$'), "storedHash" char(64) NOT NULL CHECK("storedHash" ~ '^[a-f0-9]{64}$'),
 quality jsonb NOT NULL CHECK(jsonb_typeof(quality)='object' AND octet_length(quality::text)<2048),
 source varchar(48) NOT NULL DEFAULT 'OWNER_SELECTION_NOT_RENTAL_EVIDENCE' CHECK(source='OWNER_SELECTION_NOT_RENTAL_EVIDENCE'),
 "createdAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX "DevItemPhoto_listingId_createdAt_idx" ON "DevItemPhoto"("listingId","createdAt");
CREATE TABLE "DevItemVersion" (
 id uuid PRIMARY KEY, "listingId" integer NOT NULL REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "ownerId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 revision integer NOT NULL CHECK(revision BETWEEN 1 AND 200), category varchar(64) NOT NULL,
 checklist jsonb NOT NULL CHECK(jsonb_typeof(checklist)='object' AND octet_length(checklist::text)<8192),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<16384),
 "sourceCreatedAt" timestamptz(3) NOT NULL,"confirmedAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT "DevItemVersion_listingId_revision_key" UNIQUE("listingId",revision)
);
CREATE TABLE "DevItemEvent" (
 id uuid PRIMARY KEY,"listingId" integer NOT NULL REFERENCES "Listing"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "actorId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "previousRevision" integer NOT NULL,revision integer NOT NULL CHECK(revision="previousRevision"+1 AND revision BETWEEN 1 AND 200),
 action varchar(16) NOT NULL CHECK(action IN ('SAVE','PHOTO','CONFIRM')),
 "versionId" uuid REFERENCES "DevItemVersion"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 "createdAt" timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 CHECK((action='CONFIRM')=("versionId" IS NOT NULL)),
 CONSTRAINT "DevItemEvent_listingId_revision_key" UNIQUE("listingId",revision)
);
CREATE FUNCTION hustlen_item_candidate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor integer; own integer; marker text;
BEGIN
 IF TG_OP<>'INSERT' AND TG_TABLE_NAME<>'DevItemDraft' THEN RAISE EXCEPTION 'Documentation history immutable'; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Documentation deletion unavailable'; END IF;
 SELECT shobj_description(oid,'pg_database') INTO marker FROM pg_database WHERE datname=current_database();
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR coalesce(marker,'') !~ '^hustlen-mrt-test:[a-f0-9]{24}$' OR current_setting('hustlen.item_studio',true) IS DISTINCT FROM 'owned-studio-only' THEN RAISE EXCEPTION 'Owned documentation gate required'; END IF;
 actor:=nullif(current_setting('hustlen.item_actor',true),'')::integer;
 SELECT "ownerId" INTO own FROM "Listing" WHERE id=NEW."listingId";
 IF actor IS NULL OR own IS DISTINCT FROM actor OR NOT EXISTS(SELECT 1 FROM "User" WHERE id=actor AND "accountStatus"='ACTIVE') THEN RAISE EXCEPTION 'Documentation owner required'; END IF;
 IF TG_TABLE_NAME='DevItemEvent' THEN
  IF NEW."actorId" IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Actor mismatch'; END IF;
  NEW."createdAt":=clock_timestamp();
 ELSE
  IF NEW."ownerId" IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Owner mismatch'; END IF;
  IF TG_TABLE_NAME='DevItemDraft' THEN
   IF TG_OP='UPDATE' THEN
    IF NEW."listingId"<>OLD."listingId" OR NEW."ownerId"<>OLD."ownerId" OR NEW.revision<>OLD.revision+1 OR NEW.category<>OLD.category OR NEW.checklist<>OLD.checklist THEN RAISE EXCEPTION 'Invalid draft revision'; END IF;
    NEW."createdAt":=OLD."createdAt";
   ELSE
    IF NEW.revision<>1 THEN RAISE EXCEPTION 'Initial revision required'; END IF;
    NEW."createdAt":=clock_timestamp();
   END IF;
   NEW."updatedAt":=clock_timestamp();
  ELSIF TG_TABLE_NAME='DevItemVersion' THEN NEW."confirmedAt":=clock_timestamp();
  ELSE NEW."createdAt":=clock_timestamp(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER item_draft_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevItemDraft" FOR EACH ROW EXECUTE FUNCTION hustlen_item_candidate_guard();
CREATE TRIGGER item_photo_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevItemPhoto" FOR EACH ROW EXECUTE FUNCTION hustlen_item_candidate_guard();
CREATE TRIGGER item_version_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevItemVersion" FOR EACH ROW EXECUTE FUNCTION hustlen_item_candidate_guard();
CREATE TRIGGER item_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevItemEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_item_candidate_guard();
CREATE FUNCTION hustlen_item_atomic_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d "DevItemDraft"; e "DevItemEvent"; p jsonb;
BEGIN
 SELECT * INTO d FROM "DevItemDraft" WHERE "listingId"=NEW."listingId";
 SELECT * INTO e FROM "DevItemEvent" WHERE "listingId"=NEW."listingId" AND revision=NEW.revision;
 IF d."listingId" IS NULL OR e.id IS NULL OR e."actorId"<>d."ownerId" THEN RAISE EXCEPTION 'Atomic documentation event required'; END IF;
 IF TG_TABLE_NAME='DevItemEvent' AND d.revision<>NEW.revision THEN RAISE EXCEPTION 'Event revision mismatch'; END IF;
 IF TG_TABLE_NAME='DevItemVersion' THEN
 IF (e.action<>'CONFIRM' OR e."versionId"<>NEW.id OR NEW.data<>d.data OR NEW.checklist<>d.checklist OR NEW.category<>d.category OR NEW.revision<>d.revision OR NEW."sourceCreatedAt"<>d."createdAt") THEN RAISE EXCEPTION 'Confirmation snapshot mismatch'; END IF;
 END IF;
 IF TG_TABLE_NAME='DevItemPhoto' THEN
 IF (e.action<>'PHOTO' OR (SELECT count(*) FROM "DevItemPhoto" WHERE "listingId"=NEW."listingId")>24) THEN RAISE EXCEPTION 'Photo event/limit required'; END IF;
 END IF;
 IF TG_TABLE_NAME='DevItemDraft' THEN
  IF jsonb_typeof(NEW.data->'photos') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.data->'photos')>4 THEN RAISE EXCEPTION 'Bounded photo references required'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(NEW.data->'photos') LOOP
   IF NOT EXISTS(SELECT 1 FROM "DevItemPhoto" WHERE id=(p->>'photoId')::uuid AND "listingId"=NEW."listingId" AND "ownerId"=NEW."ownerId" AND "areaId"=p->>'areaId') THEN RAISE EXCEPTION 'Foreign photo reference'; END IF;
  END LOOP;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER item_draft_history AFTER INSERT OR UPDATE ON "DevItemDraft" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_item_atomic_history();
CREATE CONSTRAINT TRIGGER item_photo_history AFTER INSERT ON "DevItemPhoto" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_item_atomic_history();
CREATE CONSTRAINT TRIGGER item_version_history AFTER INSERT ON "DevItemVersion" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_item_atomic_history();

CREATE CONSTRAINT TRIGGER item_event_history AFTER INSERT ON "DevItemEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_item_atomic_history();

CREATE FUNCTION hustlen_item_no_truncate_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE populated boolean;
BEGIN
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I LIMIT 1)',TG_TABLE_SCHEMA,TG_TABLE_NAME) INTO populated;
 IF populated THEN RAISE EXCEPTION 'Documentation history cannot be truncated'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER item_draft_truncate BEFORE TRUNCATE ON "DevItemDraft" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER item_photo_truncate BEFORE TRUNCATE ON "DevItemPhoto" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER item_version_truncate BEFORE TRUNCATE ON "DevItemVersion" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER item_event_truncate BEFORE TRUNCATE ON "DevItemEvent" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();

COMMIT;
