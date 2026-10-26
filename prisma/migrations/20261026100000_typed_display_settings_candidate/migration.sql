BEGIN;
CREATE TABLE "DevDisplaySetting" (
 key varchar(64) PRIMARY KEY, value integer NOT NULL, version integer NOT NULL CHECK(version>0),
 policy varchar(32) NOT NULL DEFAULT 'owned-display-10b-v1' CHECK(policy='owned-display-10b-v1'),
 "actorId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((key='dev.announcements.visible' AND value IN(0,1)) OR (key='dev.announcements.maxVisible' AND value BETWEEN 1 AND 100))
);
CREATE TABLE "DevDisplaySettingEvent" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key varchar(64) NOT NULL REFERENCES "DevDisplaySetting"(key) ON DELETE RESTRICT,
 action varchar(16) NOT NULL CHECK(action IN('SET','ROLLBACK')),
 "previousValue" integer NOT NULL, value integer NOT NULL,
 "previousVersion" integer NOT NULL CHECK("previousVersion">=0), version integer NOT NULL CHECK(version="previousVersion"+1),
 "rollbackVersion" integer,
 policy varchar(32) NOT NULL DEFAULT 'owned-display-10b-v1' CHECK(policy='owned-display-10b-v1'),
 "actorId" integer NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "requestId" uuid NOT NULL UNIQUE, "requestHash" char(64) NOT NULL,
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(key,version),
 CHECK ((key='dev.announcements.visible' AND value IN(0,1) AND "previousValue" IN(0,1)) OR (key='dev.announcements.maxVisible' AND value BETWEEN 1 AND 100 AND "previousValue" BETWEEN 1 AND 100)),
 CHECK ((action='SET' AND "rollbackVersion" IS NULL) OR (action='ROLLBACK' AND "rollbackVersion" IS NOT NULL AND "rollbackVersion">=0 AND "rollbackVersion"<"previousVersion"))
);
CREATE FUNCTION display_setting_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Display configuration history immutable'; END IF;
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR coalesce(shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database'),'') !~ '^hustlen-mrt-test:[a-f0-9]{24}$' THEN RAISE EXCEPTION 'Display settings candidate unavailable'; END IF;
 IF TG_OP='DELETE' OR (TG_TABLE_NAME='DevDisplaySettingEvent' AND TG_OP<>'INSERT') THEN RAISE EXCEPTION 'Display configuration history immutable'; END IF;
 IF TG_TABLE_NAME='DevDisplaySetting' THEN
  IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'Start at revision one'; END IF;
  IF TG_OP='UPDATE' AND (NEW.key<>OLD.key OR NEW.version<>OLD.version+1 OR NEW.policy<>OLD.policy) THEN RAISE EXCEPTION 'Invalid display configuration version'; END IF;
  NEW."updatedAt"=clock_timestamp();
 ELSE
  NEW.id=gen_random_uuid();NEW."createdAt"=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER display_setting_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevDisplaySetting" FOR EACH ROW EXECUTE FUNCTION display_setting_guard();
CREATE TRIGGER display_setting_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevDisplaySettingEvent" FOR EACH ROW EXECUTE FUNCTION display_setting_guard();
CREATE TRIGGER display_setting_truncate_guard BEFORE TRUNCATE ON "DevDisplaySetting" EXECUTE FUNCTION display_setting_guard();
CREATE TRIGGER display_setting_event_truncate_guard BEFORE TRUNCATE ON "DevDisplaySettingEvent" EXECUTE FUNCTION display_setting_guard();
CREATE FUNCTION display_setting_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; prior_value integer;
BEGIN
 IF TG_TABLE_NAME='DevDisplaySetting' THEN
  SELECT count(*) INTO n FROM "DevDisplaySettingEvent" WHERE key=NEW.key AND version=NEW.version AND value=NEW.value AND "actorId"=NEW."actorId";
 ELSE
  SELECT count(*) INTO n FROM "DevDisplaySetting" WHERE key=NEW.key AND version>=NEW.version;
  IF NEW."previousVersion"=0 THEN prior_value=CASE WHEN NEW.key='dev.announcements.visible' THEN 1 ELSE 100 END;
  ELSE SELECT value INTO prior_value FROM "DevDisplaySettingEvent" WHERE key=NEW.key AND version=NEW."previousVersion"; END IF;
  IF prior_value IS NULL OR prior_value<>NEW."previousValue" THEN RAISE EXCEPTION 'Invalid previous display value'; END IF;
  IF NEW.action='ROLLBACK' THEN
   IF NEW."rollbackVersion"=0 THEN prior_value=CASE WHEN NEW.key='dev.announcements.visible' THEN 1 ELSE 100 END;
   ELSE SELECT value INTO prior_value FROM "DevDisplaySettingEvent" WHERE key=NEW.key AND version=NEW."rollbackVersion"; END IF;
   IF prior_value IS NULL OR prior_value<>NEW.value THEN RAISE EXCEPTION 'Invalid rollback display value'; END IF;
  END IF;
 END IF;
 IF n<>1 THEN RAISE EXCEPTION 'Atomic display configuration event required'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER display_setting_integrity AFTER INSERT OR UPDATE ON "DevDisplaySetting" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION display_setting_integrity();
CREATE CONSTRAINT TRIGGER display_setting_event_integrity AFTER INSERT ON "DevDisplaySettingEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION display_setting_integrity();
COMMIT;
