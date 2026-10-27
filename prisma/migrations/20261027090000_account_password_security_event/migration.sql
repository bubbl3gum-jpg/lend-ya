-- Additive only: no credential/session backfill or staff grants.
BEGIN;
CREATE TABLE "AccountSecurityEvent" (
 id UUID PRIMARY KEY,
 "actorId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 action VARCHAR(40) NOT NULL CHECK(action='PASSWORD_CHANGED'),
 "revokedSessions" INTEGER NOT NULL CHECK("revokedSessions">0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX "AccountSecurityEvent_actorId_createdAt_idx" ON "AccountSecurityEvent"("actorId","createdAt");
CREATE FUNCTION account_security_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Account security history is append-only'; END $$;
CREATE TRIGGER account_security_event_no_change BEFORE UPDATE OR DELETE ON "AccountSecurityEvent" FOR EACH ROW EXECUTE FUNCTION account_security_event_immutable();
CREATE TRIGGER account_security_event_no_truncate BEFORE TRUNCATE ON "AccountSecurityEvent" FOR EACH STATEMENT EXECUTE FUNCTION account_security_event_immutable();
COMMIT;
