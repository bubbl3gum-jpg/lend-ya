-- Isolated requester-only candidate. Refuse DDL outside a verified disposable DB.
BEGIN;
DO $$ BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Owned private-channel database required' USING ERRCODE='23514'; END IF;
END $$;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requester_identity_key" UNIQUE(id,"requesterUserId");
CREATE TABLE "SupportParticipantChannel" (
 id UUID PRIMARY KEY,
 "ticketId" UUID NOT NULL UNIQUE,
 "participantUserId" INT NOT NULL,
 "relationshipSide" VARCHAR(24) NOT NULL CHECK ("relationshipSide" IN ('BOOKING_OWNER','BOOKING_BORROWER','LISTING_OWNER','REPORTER','REQUESTER')),
 "policyVersion" VARCHAR(80) NOT NULL CHECK("policyVersion"='support-owned-requester-channel-8c-v1'),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportParticipantChannel_ticket_requester_key" UNIQUE("ticketId","participantUserId"),
 CONSTRAINT "SupportParticipantChannel_identity_key" UNIQUE(id,"ticketId","participantUserId"),
 CONSTRAINT "SupportParticipantChannel_requester_fkey" FOREIGN KEY("ticketId","participantUserId") REFERENCES "SupportTicket"(id,"requesterUserId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE TABLE "SupportMessage" (
 id UUID PRIMARY KEY,
 "channelId" UUID NOT NULL,
 "ticketId" UUID NOT NULL,
 "authorUserId" INT NOT NULL,
 "requestKey" UUID NOT NULL,
 "requestHash" VARCHAR(64) NOT NULL CHECK("requestHash" ~ '^[a-f0-9]{64}$'),
 content VARCHAR(2000) NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 2000),
 sequence INT NOT NULL CHECK(sequence>0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("channelId","sequence"), UNIQUE("channelId","requestKey"),
 CONSTRAINT "SupportMessage_channel_author_fkey" FOREIGN KEY("channelId","ticketId","authorUserId") REFERENCES "SupportParticipantChannel"(id,"ticketId","participantUserId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE FUNCTION support_channel_candidate_side(ticket UUID, participant INT) RETURNS TEXT LANGUAGE sql STABLE AS $$
 SELECT CASE
 WHEN t."bookingId" IS NOT NULL OR t."disputeId" IS NOT NULL THEN
   CASE WHEN (t."disputeId" IS NULL OR d.id IS NOT NULL) AND b.id IS NOT NULL AND b."ownerId"<>b."renterId" THEN
     CASE WHEN b."ownerId"=participant THEN 'BOOKING_OWNER' WHEN b."renterId"=participant THEN 'BOOKING_BORROWER' END END
 WHEN t."listingId" IS NOT NULL THEN CASE WHEN l."ownerId"=participant THEN 'LISTING_OWNER' END
 WHEN t."reportId" IS NOT NULL THEN CASE WHEN r."reporterId"=participant AND rl."ownerId"<>participant THEN 'REPORTER' END
 ELSE 'REQUESTER' END
 FROM "SupportTicket" t
 LEFT JOIN "Dispute" d ON d.id=t."disputeId" AND d."openedBy"=participant
 LEFT JOIN "Booking" b ON b.id=COALESCE(t."bookingId",d."bookingId")
 LEFT JOIN "Listing" l ON l.id=t."listingId"
 LEFT JOIN "ListingReport" r ON r.id=t."reportId"
 LEFT JOIN "Listing" rl ON rl.id=r."listingId"
 WHERE t.id=ticket AND t."requesterUserId"=participant AND t."currentState"='RECEIVED'
$$;
CREATE FUNCTION support_channel_candidate_insert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE side TEXT;
BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Owned private-channel database required' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "User" WHERE id=NEW."participantUserId" AND "accountStatus"='ACTIVE' FOR UPDATE) THEN RAISE EXCEPTION 'Channel unavailable' USING ERRCODE='23514'; END IF;
 PERFORM id FROM "SupportTicket" WHERE id=NEW."ticketId" AND "requesterUserId"=NEW."participantUserId" FOR UPDATE;
 side=support_channel_candidate_side(NEW."ticketId",NEW."participantUserId");
 IF side IS NULL OR side<>NEW."relationshipSide" THEN RAISE EXCEPTION 'Channel unavailable' USING ERRCODE='23514'; END IF;
 NEW."createdAt"=CURRENT_TIMESTAMP; RETURN NEW;
END $$;
CREATE TRIGGER support_channel_candidate_insert BEFORE INSERT ON "SupportParticipantChannel" FOR EACH ROW EXECUTE FUNCTION support_channel_candidate_insert();
CREATE FUNCTION support_message_candidate_insert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE c "SupportParticipantChannel"%ROWTYPE; expected INT;
BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Owned private-channel database required' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "User" WHERE id=NEW."authorUserId" AND "accountStatus"='ACTIVE' FOR UPDATE) THEN RAISE EXCEPTION 'Channel unavailable' USING ERRCODE='23514'; END IF;
 SELECT * INTO c FROM "SupportParticipantChannel" WHERE id=NEW."channelId" AND "ticketId"=NEW."ticketId" AND "participantUserId"=NEW."authorUserId" FOR UPDATE;
 IF NOT FOUND OR support_channel_candidate_side(c."ticketId",NEW."authorUserId") IS DISTINCT FROM c."relationshipSide" THEN RAISE EXCEPTION 'Channel unavailable' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(max(sequence),0)+1 INTO expected FROM "SupportMessage" WHERE "channelId"=c.id;
 IF NEW.sequence<>expected THEN RAISE EXCEPTION 'Invalid message sequence' USING ERRCODE='23514'; END IF;
 NEW."createdAt"=CURRENT_TIMESTAMP; RETURN NEW;
END $$;
CREATE TRIGGER support_message_candidate_insert BEFORE INSERT ON "SupportMessage" FOR EACH ROW EXECUTE FUNCTION support_message_candidate_insert();
CREATE TRIGGER support_channel_immutable BEFORE UPDATE OR DELETE ON "SupportParticipantChannel" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_channel_no_truncate BEFORE TRUNCATE ON "SupportParticipantChannel" FOR EACH STATEMENT EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_message_immutable BEFORE UPDATE OR DELETE ON "SupportMessage" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_message_no_truncate BEFORE TRUNCATE ON "SupportMessage" FOR EACH STATEMENT EXECUTE FUNCTION support_ticket_candidate_immutable();
REVOKE ALL ON "SupportParticipantChannel","SupportMessage" FROM PUBLIC;
REVOKE ALL ON FUNCTION support_channel_candidate_side(UUID,INT),support_channel_candidate_insert(),support_message_candidate_insert() FROM PUBLIC;
COMMIT;
