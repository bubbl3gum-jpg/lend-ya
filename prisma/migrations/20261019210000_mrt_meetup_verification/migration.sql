CREATE TABLE "MeetupSession" ("bookingId" INTEGER PRIMARY KEY REFERENCES "Booking"(id) ON DELETE RESTRICT, "enabledBy" INTEGER NOT NULL, "bookingVersion" INTEGER NOT NULL DEFAULT 0 CHECK("bookingVersion">=0), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "MeetupCheckIn" (
 id SERIAL PRIMARY KEY,"bookingId" INTEGER NOT NULL REFERENCES "MeetupSession"("bookingId") ON DELETE RESTRICT,"userId" INTEGER NOT NULL,
 purpose VARCHAR(8) NOT NULL CHECK(purpose IN ('PICKUP','RETURN')),role VARCHAR(8) NOT NULL CHECK(role IN ('OWNER','BORROWER')),
 outcome VARCHAR(16) NOT NULL CHECK(outcome IN ('VERIFIED','UNAVAILABLE','INACCURATE','OUTSIDE')),reason VARCHAR(40) NOT NULL,
 "accuracyMeters" INTEGER,"distanceBand" INTEGER,"policyVersion" VARCHAR(32) NOT NULL,"requestKey" VARCHAR(128) NOT NULL,"requestHash" VARCHAR(64) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "MeetupCheckIn_bookingId_userId_purpose_requestKey_key" ON "MeetupCheckIn"("bookingId","userId",purpose,"requestKey");
CREATE INDEX "MeetupCheckIn_bookingId_purpose_userId_id_idx" ON "MeetupCheckIn"("bookingId",purpose,"userId",id);
CREATE TABLE "MeetupFallback" (
 id SERIAL PRIMARY KEY,"bookingId" INTEGER NOT NULL REFERENCES "MeetupSession"("bookingId") ON DELETE RESTRICT,purpose VARCHAR(8) NOT NULL CHECK(purpose IN ('PICKUP','RETURN')),
 "ownerCheckId" INTEGER NOT NULL REFERENCES "MeetupCheckIn"(id),"borrowerCheckId" INTEGER NOT NULL REFERENCES "MeetupCheckIn"(id),
 "ownerReason" VARCHAR(500),"borrowerReason" VARCHAR(500),"ownerAckAt" TIMESTAMP(3),"borrowerAckAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "MeetupFallback_check_pair_key" ON "MeetupFallback"("bookingId",purpose,"ownerCheckId","borrowerCheckId");
CREATE TABLE "MeetupChallenge" (
 id VARCHAR(36) PRIMARY KEY,"bookingId" INTEGER NOT NULL REFERENCES "MeetupSession"("bookingId") ON DELETE RESTRICT,purpose VARCHAR(8) NOT NULL CHECK(purpose IN ('PICKUP','RETURN')),
 "issuerId" INTEGER NOT NULL,"issueKey" VARCHAR(128) NOT NULL,"verifierId" INTEGER NOT NULL,"bookingState" VARCHAR(32) NOT NULL,"bookingVersion" INTEGER NOT NULL,"bookingUpdatedAt" TIMESTAMP(3) NOT NULL,
 "ownerCheckId" INTEGER NOT NULL REFERENCES "MeetupCheckIn"(id),"borrowerCheckId" INTEGER NOT NULL REFERENCES "MeetupCheckIn"(id),"fallbackId" INTEGER REFERENCES "MeetupFallback"(id),
 "tokenHash" VARCHAR(64) NOT NULL,"codeHash" VARCHAR(64) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),"consumedAt" TIMESTAMP(3),"verificationKey" VARCHAR(128),"verificationHash" VARCHAR(64),"completedAt" TIMESTAMP(3),"completionHash" VARCHAR(64),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),CHECK("completedAt" IS NULL OR "consumedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "MeetupChallenge_bookingId_purpose_issueKey_key" ON "MeetupChallenge"("bookingId",purpose,"issueKey");
CREATE INDEX "MeetupChallenge_bookingId_purpose_createdAt_idx" ON "MeetupChallenge"("bookingId",purpose,"createdAt");
CREATE UNIQUE INDEX "MeetupChallenge_one_active" ON "MeetupChallenge"("bookingId",purpose) WHERE "revokedAt" IS NULL AND "completedAt" IS NULL;
CREATE TABLE "MeetupEvent" (id SERIAL PRIMARY KEY,"bookingId" INTEGER NOT NULL REFERENCES "MeetupSession"("bookingId") ON DELETE RESTRICT,"actorId" INTEGER NOT NULL,purpose VARCHAR(8) NOT NULL,kind VARCHAR(40) NOT NULL,"challengeId" VARCHAR(36),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "MeetupEvent_bookingId_id_idx" ON "MeetupEvent"("bookingId",id);
CREATE TABLE "MeetupRate" (key VARCHAR(160) PRIMARY KEY,"bookingId" INTEGER NOT NULL REFERENCES "MeetupSession"("bookingId") ON DELETE RESTRICT,attempts INTEGER NOT NULL DEFAULT 0,"expiresAt" TIMESTAMP(3) NOT NULL);
CREATE FUNCTION protect_meetup_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR TG_TABLE_NAME IN ('MeetupCheckIn','MeetupEvent') THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 IF TG_TABLE_NAME='MeetupSession' THEN
  IF (to_jsonb(NEW)-'bookingVersion') IS DISTINCT FROM (to_jsonb(OLD)-'bookingVersion') OR NEW."bookingVersion"<>OLD."bookingVersion"+1 OR pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 ELSIF TG_TABLE_NAME='MeetupFallback' THEN
  IF (to_jsonb(NEW)-ARRAY['ownerReason','borrowerReason','ownerAckAt','borrowerAckAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['ownerReason','borrowerReason','ownerAckAt','borrowerAckAt'])
   OR (OLD."ownerAckAt" IS NOT NULL AND (NEW."ownerAckAt",NEW."ownerReason") IS DISTINCT FROM (OLD."ownerAckAt",OLD."ownerReason"))
   OR (OLD."borrowerAckAt" IS NOT NULL AND (NEW."borrowerAckAt",NEW."borrowerReason") IS DISTINCT FROM (OLD."borrowerAckAt",OLD."borrowerReason")) THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 ELSIF TG_TABLE_NAME='MeetupChallenge' THEN
  IF OLD."completedAt" IS NOT NULL OR (to_jsonb(NEW)-ARRAY['revokedAt','consumedAt','verificationKey','verificationHash','completedAt','completionHash','attempts']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revokedAt','consumedAt','verificationKey','verificationHash','completedAt','completionHash','attempts'])
   OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt")
   OR (OLD."consumedAt" IS NOT NULL AND (NEW."consumedAt",NEW."verificationKey",NEW."verificationHash") IS DISTINCT FROM (OLD."consumedAt",OLD."verificationKey",OLD."verificationHash")) THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_meetup_session BEFORE UPDATE OR DELETE ON "MeetupSession" FOR EACH ROW EXECUTE FUNCTION protect_meetup_record();
CREATE TRIGGER protect_meetup_check BEFORE UPDATE OR DELETE ON "MeetupCheckIn" FOR EACH ROW EXECUTE FUNCTION protect_meetup_record();
CREATE TRIGGER protect_meetup_fallback BEFORE UPDATE OR DELETE ON "MeetupFallback" FOR EACH ROW EXECUTE FUNCTION protect_meetup_record();
CREATE TRIGGER protect_meetup_challenge BEFORE UPDATE OR DELETE ON "MeetupChallenge" FOR EACH ROW EXECUTE FUNCTION protect_meetup_record();
CREATE TRIGGER protect_meetup_event BEFORE UPDATE OR DELETE ON "MeetupEvent" FOR EACH ROW EXECUTE FUNCTION protect_meetup_record();

CREATE FUNCTION bump_meetup_booking_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE "MeetupSession" SET "bookingVersion"="bookingVersion"+1 WHERE "bookingId"=NEW.id;
 RETURN NEW;
END $$;
CREATE TRIGGER bump_meetup_booking_version AFTER UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION bump_meetup_booking_version();
