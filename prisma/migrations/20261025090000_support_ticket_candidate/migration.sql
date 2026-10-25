-- Candidate only: no legacy updates, grants, identities, retention or staff powers.
BEGIN;
CREATE TABLE "SupportTicket" (
 id UUID PRIMARY KEY, "requesterUserId" INT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "categoryCode" VARCHAR(32) NOT NULL CHECK ("categoryCode" IN ('RENTAL_HANDOFF_RETURN','LISTING_PROBLEM','ACCOUNT_HELP','OTHER_SUPPORT')),
 "policyVersion" VARCHAR(80) NOT NULL CHECK ("policyVersion"='support-owned-candidate-8b-v1'),
 subject VARCHAR(120) NOT NULL CHECK (length(btrim(subject)) BETWEEN 1 AND 120),
 description VARCHAR(2000) NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 2000),
 "currentState" VARCHAR(32) NOT NULL CHECK ("currentState"='RECEIVED'),
 "lifecycleVersion" INT NOT NULL CHECK ("lifecycleVersion"=1),
 "requestKey" UUID NOT NULL, "requestHash" VARCHAR(64) NOT NULL CHECK ("requestHash" ~ '^[a-f0-9]{64}$'),
 "initialEventId" UUID NOT NULL UNIQUE,
 "bookingId" INT REFERENCES "Booking"(id) ON DELETE RESTRICT,
 "listingId" INT REFERENCES "Listing"(id) ON DELETE RESTRICT,
 "reportId" INT REFERENCES "ListingReport"(id) ON DELETE RESTRICT,
 "disputeId" INT REFERENCES "Dispute"(id) ON DELETE RESTRICT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportTicket_one_primary_link" CHECK (num_nonnulls("bookingId","listingId","reportId","disputeId")<=1),
 UNIQUE("requesterUserId","requestKey"), CONSTRAINT "SupportTicket_identity_key" UNIQUE(id,"requesterUserId","requestKey","lifecycleVersion")
);
CREATE INDEX "SupportTicket_requesterUserId_createdAt_id_idx" ON "SupportTicket"("requesterUserId","createdAt",id);
CREATE TABLE "SupportTicketEvent" (
 id UUID PRIMARY KEY, "ticketId" UUID NOT NULL,
 "actorUserId" INT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "eventType" VARCHAR(32) NOT NULL CHECK ("eventType"='TICKET_RECEIVED'),
 sequence INT NOT NULL CHECK(sequence=1), "lifecycleVersion" INT NOT NULL CHECK("lifecycleVersion"=sequence),
 "correlationId" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("ticketId",sequence), CONSTRAINT "SupportTicketEvent_initial_key" UNIQUE(id,"ticketId","actorUserId","correlationId","lifecycleVersion"),
 CONSTRAINT "SupportTicketEvent_parent_fkey" FOREIGN KEY("ticketId","actorUserId","correlationId","lifecycleVersion") REFERENCES "SupportTicket"(id,"requesterUserId","requestKey","lifecycleVersion") DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_initial_event_required"
 FOREIGN KEY("initialEventId",id,"requesterUserId","requestKey","lifecycleVersion") REFERENCES "SupportTicketEvent"(id,"ticketId","actorUserId","correlationId","lifecycleVersion") DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION support_ticket_candidate_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Owned Support candidate database required' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "User" WHERE id=NEW."requesterUserId" AND "accountStatus"='ACTIVE' FOR UPDATE) THEN RAISE EXCEPTION 'Support requester unavailable' USING ERRCODE='23514'; END IF;
 IF NEW."bookingId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Booking" WHERE id=NEW."bookingId" AND NEW."requesterUserId" IN ("ownerId","renterId") FOR SHARE) THEN RAISE EXCEPTION 'Support relationship denied' USING ERRCODE='23514'; END IF;
 IF NEW."listingId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Listing" WHERE id=NEW."listingId" AND "ownerId"=NEW."requesterUserId" FOR SHARE) THEN RAISE EXCEPTION 'Support relationship denied' USING ERRCODE='23514'; END IF;
 IF NEW."reportId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "ListingReport" WHERE id=NEW."reportId" AND "reporterId"=NEW."requesterUserId" FOR SHARE) THEN RAISE EXCEPTION 'Support relationship denied' USING ERRCODE='23514'; END IF;
 IF NEW."disputeId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Dispute" d JOIN "Booking" b ON b.id=d."bookingId" WHERE d.id=NEW."disputeId" AND d."openedBy"=NEW."requesterUserId" AND NEW."requesterUserId" IN(b."ownerId",b."renterId") FOR SHARE) THEN RAISE EXCEPTION 'Support relationship denied' USING ERRCODE='23514'; END IF;
 NEW."createdAt"=CURRENT_TIMESTAMP; NEW."updatedAt"=NEW."createdAt"; RETURN NEW;
END $$;
CREATE TRIGGER support_ticket_candidate_insert BEFORE INSERT ON "SupportTicket" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_insert();
CREATE FUNCTION support_ticket_candidate_event_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW."createdAt"=CURRENT_TIMESTAMP; RETURN NEW; END $$;
CREATE TRIGGER support_ticket_candidate_event_insert BEFORE INSERT ON "SupportTicketEvent" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_event_insert();
CREATE FUNCTION support_ticket_candidate_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Support candidate history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER support_ticket_immutable BEFORE UPDATE OR DELETE ON "SupportTicket" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_ticket_event_immutable BEFORE UPDATE OR DELETE ON "SupportTicketEvent" FOR EACH ROW EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_ticket_no_truncate BEFORE TRUNCATE ON "SupportTicket" FOR EACH STATEMENT EXECUTE FUNCTION support_ticket_candidate_immutable();
CREATE TRIGGER support_ticket_event_no_truncate BEFORE TRUNCATE ON "SupportTicketEvent" FOR EACH STATEMENT EXECUTE FUNCTION support_ticket_candidate_immutable();
COMMIT;
