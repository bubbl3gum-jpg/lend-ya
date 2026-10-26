BEGIN;
-- Additive candidate only. No existing tables, rows or migrations rewritten.
CREATE TABLE "Announcement" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(120) NOT NULL,
 body varchar(4000) NOT NULL, state varchar(16) NOT NULL DEFAULT 'DRAFT',
 audience varchar(32) NOT NULL DEFAULT 'OWNED_TEST_ADMIN', version integer NOT NULL DEFAULT 1,
 "creatorId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "startsAt" timestamptz(3), "expiresAt" timestamptz(3),
 CHECK (length(btrim(title)) BETWEEN 1 AND 120 AND length(btrim(body)) BETWEEN 1 AND 4000),
 CHECK (state IN ('DRAFT','PUBLISHED','ARCHIVED') AND audience='OWNED_TEST_ADMIN' AND version>0),
 CHECK (("startsAt" IS NULL AND "expiresAt" IS NULL) OR ("startsAt" IS NOT NULL AND "expiresAt">"startsAt")),
 CHECK (state<>'PUBLISHED' OR ("startsAt" IS NOT NULL AND "expiresAt" IS NOT NULL))
);
CREATE INDEX "Announcement_state_startsAt_expiresAt_idx" ON "Announcement"(state,"startsAt","expiresAt");
CREATE TABLE "AnnouncementEvent" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "announcementId" uuid NOT NULL REFERENCES "Announcement"(id) ON DELETE RESTRICT,
 "actorId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 action varchar(16) NOT NULL CHECK(action IN ('CREATE','EDIT','PUBLISH','WITHDRAW','ARCHIVE')),
 "previousVersion" integer NOT NULL, "resultingVersion" integer NOT NULL,
 "requestId" uuid NOT NULL UNIQUE, "requestHash" char(64) NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("previousVersion">=0 AND "resultingVersion"="previousVersion"+1),
 UNIQUE("announcementId","resultingVersion")
);
-- No content snapshots or unrestricted request data in immutable history.
CREATE FUNCTION announcement_candidate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR
    coalesce(shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database'),'') !~ '^hustlen-mrt-test:[a-f0-9]{24}$' THEN
   RAISE EXCEPTION 'Announcement candidate unavailable';
 END IF;
 IF TG_TABLE_NAME='AnnouncementEvent' AND TG_OP<>'INSERT' OR TG_OP='DELETE' THEN
   RAISE EXCEPTION 'Announcement history is immutable';
 END IF;
 IF TG_TABLE_NAME='Announcement' THEN
   IF TG_OP='UPDATE' THEN
     IF NEW.id<>OLD.id OR NEW."creatorId"<>OLD."creatorId" OR NEW."createdAt"<>OLD."createdAt" OR NEW.version<>OLD.version+1 OR OLD.state='ARCHIVED' THEN
       RAISE EXCEPTION 'Invalid announcement revision';
     END IF;
     IF OLD.state='PUBLISHED' AND (NEW.state<>'ARCHIVED' OR NEW.title<>OLD.title OR NEW.body<>OLD.body OR NEW."startsAt"<>OLD."startsAt" OR NEW."expiresAt"<>OLD."expiresAt") THEN
       RAISE EXCEPTION 'Published content is immutable';
     END IF;
   ELSE
     IF NEW.state<>'DRAFT' OR NEW.version<>1 THEN RAISE EXCEPTION 'Create draft first'; END IF;
     NEW.id=gen_random_uuid(); NEW."createdAt"=clock_timestamp();
   END IF;
   NEW."updatedAt"=clock_timestamp();
 ELSE
   NEW.id=gen_random_uuid(); NEW."createdAt"=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER announcement_guard BEFORE INSERT OR UPDATE OR DELETE ON "Announcement" FOR EACH ROW EXECUTE FUNCTION announcement_candidate_guard();
CREATE TRIGGER announcement_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "AnnouncementEvent" FOR EACH ROW EXECUTE FUNCTION announcement_candidate_guard();
-- Deferred mutual linkage makes event failure or eventless writes roll back the whole transaction.
CREATE FUNCTION announcement_revision_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
 IF TG_TABLE_NAME='Announcement' THEN
   SELECT count(*) INTO n FROM "AnnouncementEvent" WHERE "announcementId"=NEW.id AND "resultingVersion"=NEW.version;
 ELSE
   SELECT count(*) INTO n FROM "Announcement" WHERE id=NEW."announcementId" AND version>=NEW."resultingVersion";
 END IF;
 IF n<>1 THEN RAISE EXCEPTION 'Announcement revision event required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER announcement_revision_check AFTER INSERT OR UPDATE ON "Announcement" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION announcement_revision_integrity();
CREATE CONSTRAINT TRIGGER announcement_event_check AFTER INSERT ON "AnnouncementEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION announcement_revision_integrity();

CREATE FUNCTION announcement_no_truncate() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Announcement history cannot be truncated';END$$;
CREATE TRIGGER announcement_no_truncate BEFORE TRUNCATE ON "Announcement" EXECUTE FUNCTION announcement_no_truncate();
CREATE TRIGGER announcement_event_no_truncate BEFORE TRUNCATE ON "AnnouncementEvent" EXECUTE FUNCTION announcement_no_truncate();
COMMIT;
