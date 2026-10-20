-- Existing consumed challenges retain NULL and fail closed: issue a replacement.
-- No Booking, evidence or historical migration is rewritten.
ALTER TABLE "MeetupChallenge" ADD COLUMN "confirmationExpiresAt" TIMESTAMP(3);
ALTER TABLE "MeetupChallenge" ADD CONSTRAINT "MeetupChallenge_confirmation_bound" CHECK (
 "confirmationExpiresAt" IS NULL OR ("consumedAt" IS NOT NULL AND
 "confirmationExpiresAt" >= "consumedAt" + INTERVAL '60 seconds' AND
 "confirmationExpiresAt" <= "consumedAt" + INTERVAL '1800 seconds'));
CREATE OR REPLACE FUNCTION protect_meetup_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR TG_TABLE_NAME IN ('MeetupCheckIn','MeetupEvent') THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 IF TG_TABLE_NAME='MeetupSession' THEN
  IF (to_jsonb(NEW)-'bookingVersion') IS DISTINCT FROM (to_jsonb(OLD)-'bookingVersion') OR NEW."bookingVersion"<>OLD."bookingVersion"+1 OR pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 ELSIF TG_TABLE_NAME='MeetupFallback' THEN
  IF (to_jsonb(NEW)-ARRAY['ownerReason','borrowerReason','ownerAckAt','borrowerAckAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['ownerReason','borrowerReason','ownerAckAt','borrowerAckAt'])
   OR (OLD."ownerAckAt" IS NOT NULL AND (NEW."ownerAckAt",NEW."ownerReason") IS DISTINCT FROM (OLD."ownerAckAt",OLD."ownerReason"))
   OR (OLD."borrowerAckAt" IS NOT NULL AND (NEW."borrowerAckAt",NEW."borrowerReason") IS DISTINCT FROM (OLD."borrowerAckAt",OLD."borrowerReason")) THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 ELSIF TG_TABLE_NAME='MeetupChallenge' THEN
  IF (OLD."consumedAt" IS NULL AND NEW."consumedAt" IS NOT NULL AND NEW."confirmationExpiresAt" IS NULL) OR (OLD."consumedAt" IS NULL AND NEW."consumedAt" IS NULL AND NEW."confirmationExpiresAt" IS NOT NULL) OR OLD."completedAt" IS NOT NULL OR (to_jsonb(NEW)-ARRAY['confirmationExpiresAt','revokedAt','consumedAt','verificationKey','verificationHash','completedAt','completionHash','attempts']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['confirmationExpiresAt','revokedAt','consumedAt','verificationKey','verificationHash','completedAt','completionHash','attempts'])
   OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt")
   OR (OLD."consumedAt" IS NOT NULL AND (NEW."consumedAt",NEW."verificationKey",NEW."verificationHash",NEW."confirmationExpiresAt") IS DISTINCT FROM (OLD."consumedAt",OLD."verificationKey",OLD."verificationHash",OLD."confirmationExpiresAt")) THEN RAISE EXCEPTION 'Meetup evidence is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
