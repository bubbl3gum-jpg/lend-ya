BEGIN;
-- CreateTable
CREATE TABLE "DevRecoveryRoom" (
    "disputeId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    "policy" VARCHAR(40) NOT NULL DEFAULT 'owned-recovery-room-v1',

    CONSTRAINT "DevRecoveryRoom_pkey" PRIMARY KEY ("disputeId")
);

-- CreateTable
CREATE TABLE "DevRecoveryProposal" (
    "id" UUID NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "category" VARCHAR(32) NOT NULL,
    "terms" JSONB NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3),
    "lifetimeHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "supersedesId" UUID,

    CONSTRAINT "DevRecoveryProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevRecoveryEvent" (
    "id" UUID NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "proposalId" UUID,
    "noticeId" UUID,
    "payload" JSONB NOT NULL,
    "requestKey" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "DevRecoveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevRecoveryNotice" (
    "id" UUID NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    "queuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "DevRecoveryNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevRecoveryProposal_disputeId_createdAt_idx" ON "DevRecoveryProposal"("disputeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DevRecoveryEvent_disputeId_revision_key" ON "DevRecoveryEvent"("disputeId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "DevRecoveryEvent_disputeId_actorId_requestKey_key" ON "DevRecoveryEvent"("disputeId", "actorId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "DevRecoveryNotice_eventId_key" ON "DevRecoveryNotice"("eventId");

-- CreateIndex
CREATE INDEX "DevRecoveryNotice_disputeId_recipientId_idx" ON "DevRecoveryNotice"("disputeId", "recipientId");

-- AddForeignKey
ALTER TABLE "DevRecoveryRoom" ADD CONSTRAINT "DevRecoveryRoom_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevConditionClaim"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryProposal" ADD CONSTRAINT "DevRecoveryProposal_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "DevRecoveryProposal"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryProposal" ADD CONSTRAINT "DevRecoveryProposal_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevRecoveryRoom"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryProposal" ADD CONSTRAINT "DevRecoveryProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryEvent" ADD CONSTRAINT "DevRecoveryEvent_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevRecoveryRoom"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryEvent" ADD CONSTRAINT "DevRecoveryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryEvent" ADD CONSTRAINT "DevRecoveryEvent_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DevRecoveryProposal"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryEvent" ADD CONSTRAINT "DevRecoveryEvent_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "DevRecoveryNotice"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryNotice" ADD CONSTRAINT "DevRecoveryNotice_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DevConditionNotice"("disputeId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryNotice" ADD CONSTRAINT "DevRecoveryNotice_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DevRecoveryNotice" ADD CONSTRAINT "DevRecoveryNotice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DevRecoveryEvent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "DevRecoveryRoom" ADD CHECK(revision BETWEEN 1 AND 200),ADD CHECK(policy='owned-recovery-room-v1');
ALTER TABLE "DevRecoveryProposal" ADD CHECK(revision=1),ADD CHECK("lifetimeHours" BETWEEN 1 AND 168),ADD CHECK(category IN('RETURN_ACCESSORY','ADDITIONAL_INSPECTION','DOCUMENTATION','HUMAN_ASSISTANCE','OTHER_COORDINATION')),ADD CHECK(jsonb_typeof(terms)='object' AND octet_length(terms::text)<8000);
ALTER TABLE "DevRecoveryEvent" ADD CHECK(revision BETWEEN 1 AND 200),ADD CHECK(kind IN('OPENED','MESSAGE','PROPOSED','ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED','ASSISTANCE_REQUESTED','NOTICE_VIEWED')),ADD CHECK("requestHash" ~ '^[a-f0-9]{64}$'),ADD CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<8000);
CREATE UNIQUE INDEX recovery_one_terminal ON "DevRecoveryEvent"("proposalId") WHERE kind IN('ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED');
CREATE UNIQUE INDEX recovery_one_view ON "DevRecoveryEvent"("noticeId") WHERE kind='NOTICE_VIEWED';
CREATE FUNCTION hustlen_recovery_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a integer;c "DevConditionClaim";p "DevRecoveryProposal";e "DevRecoveryEvent";n "DevRecoveryNotice";pending integer;
BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND TG_TABLE_NAME<>'DevRecoveryRoom') THEN RAISE EXCEPTION 'Recovery history immutable';END IF;
 IF current_setting('hustlen.room_pilot',true) IS DISTINCT FROM 'owned-recovery-only' THEN RAISE EXCEPTION 'Owned recovery pilot required';END IF;
 a:=hustlen_claim_actor();SELECT * INTO c FROM "DevConditionClaim" WHERE "disputeId"=NEW."disputeId";
 IF c."disputeId" IS NULL OR a NOT IN(c."ownerId",c."borrowerId") THEN RAISE EXCEPTION 'Case participant required';END IF;
 IF TG_TABLE_NAME='DevRecoveryEvent' THEN
  IF NEW.kind<>'NOTICE_VIEWED' AND NOT EXISTS(SELECT 1 FROM "Dispute" WHERE id=c."disputeId" AND status='OPEN') THEN RAISE EXCEPTION 'Case closed';END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM "Dispute" WHERE id=c."disputeId" AND status='OPEN') THEN RAISE EXCEPTION 'Case closed';END IF;
 END IF;
 IF TG_TABLE_NAME='DevRecoveryRoom' THEN
  IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-'revision') IS DISTINCT FROM(to_jsonb(OLD)-'revision') OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Room revision conflict';END IF;
  ELSE
   IF NEW.revision<>1 THEN RAISE EXCEPTION 'Initial room revision required';END IF;NEW."openedAt":=clock_timestamp();
  END IF;RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='DevRecoveryProposal' THEN
  IF EXISTS(SELECT 1 FROM "User" WHERE id IN(c."ownerId",c."borrowerId") AND "accountStatus"<>'ACTIVE') OR EXISTS(SELECT 1 FROM "UserBlock" WHERE ("blockerId"=c."ownerId" AND "blockedId"=c."borrowerId") OR ("blockerId"=c."borrowerId" AND "blockedId"=c."ownerId")) THEN RAISE EXCEPTION 'Contact restricted';END IF;
 END IF;
 IF TG_TABLE_NAME='DevRecoveryProposal' THEN
  IF NEW."authorId"<>a OR NEW.revision<>1 OR (NEW."scheduledAt" IS NOT NULL AND(NEW."scheduledAt"<=clock_timestamp() OR NEW."scheduledAt">clock_timestamp()+interval '30 days')) THEN RAISE EXCEPTION 'Invalid proposal author or time';END IF;
  IF NEW.category IN('RETURN_ACCESSORY','ADDITIONAL_INSPECTION') AND(NEW."scheduledAt" IS NULL OR coalesce(NEW.terms->>'place','')='') THEN RAISE EXCEPTION 'Coordination time and place required';END IF;
  IF EXISTS(SELECT 1 FROM "DevRecoveryEvent" WHERE "disputeId"=c."disputeId" AND kind='ACCEPTED') THEN RAISE EXCEPTION 'Agreed plan frozen';END IF;
  IF (SELECT count(*) FROM "DevRecoveryProposal" WHERE "disputeId"=c."disputeId")>=10 THEN RAISE EXCEPTION 'Proposal limit';END IF;
  SELECT count(*) INTO pending FROM "DevRecoveryProposal" x WHERE x."disputeId"=c."disputeId" AND x."expiresAt">clock_timestamp() AND NOT EXISTS(SELECT 1 FROM "DevRecoveryEvent" d WHERE d."proposalId"=x.id AND d.kind IN('ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED'));
  IF NEW."supersedesId" IS NULL THEN IF pending<>0 THEN RAISE EXCEPTION 'Unresolved proposal exists';END IF;
  ELSE
   SELECT * INTO p FROM "DevRecoveryProposal" WHERE id=NEW."supersedesId" AND "disputeId"=c."disputeId";
   IF p.id IS NULL OR pending<>1 OR p."expiresAt"<=clock_timestamp() OR EXISTS(SELECT 1 FROM "DevRecoveryEvent" WHERE "proposalId"=p.id AND kind IN('ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED')) THEN RAISE EXCEPTION 'Counterproposal stale';END IF;
  END IF;
  NEW."createdAt":=clock_timestamp();NEW."expiresAt":=NEW."createdAt"+make_interval(hours=>NEW."lifetimeHours");IF NEW."scheduledAt" IS NOT NULL THEN NEW."expiresAt":=least(NEW."expiresAt",NEW."scheduledAt");END IF;RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='DevRecoveryNotice' THEN
  SELECT * INTO e FROM "DevRecoveryEvent" WHERE id=NEW."eventId";
  IF e.id IS NULL OR e."disputeId"<>c."disputeId" OR e."actorId"<>a OR e.kind IN('OPENED','NOTICE_VIEWED') OR NEW."recipientId" IS DISTINCT FROM (CASE WHEN a=c."ownerId" THEN c."borrowerId" ELSE c."ownerId" END) THEN RAISE EXCEPTION 'Activity recipient mismatch';END IF;
  NEW."createdAt":=clock_timestamp();NEW."queuedAt":=NEW."createdAt";RETURN NEW;
 END IF;
 IF NEW.kind IN('MESSAGE','PROPOSED','ACCEPTED','SUPERSEDED') THEN
  IF EXISTS(SELECT 1 FROM "User" WHERE id IN(c."ownerId",c."borrowerId") AND "accountStatus"<>'ACTIVE') OR EXISTS(SELECT 1 FROM "UserBlock" WHERE ("blockerId"=c."ownerId" AND "blockedId"=c."borrowerId") OR ("blockerId"=c."borrowerId" AND "blockedId"=c."ownerId")) THEN RAISE EXCEPTION 'Contact restricted';END IF;
 END IF;
 IF NEW."actorId"<>a THEN RAISE EXCEPTION 'Event actor mismatch';END IF;
 IF NEW.kind IN('PROPOSED','ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED') THEN
  SELECT * INTO p FROM "DevRecoveryProposal" WHERE id=NEW."proposalId" AND "disputeId"=c."disputeId";
  IF p.id IS NULL OR NEW."noticeId" IS NOT NULL THEN RAISE EXCEPTION 'Exact proposal required';END IF;
  IF NEW.kind='PROPOSED' THEN IF p."authorId"<>a THEN RAISE EXCEPTION 'Proposer required';END IF;
  ELSE
   IF p."expiresAt"<=clock_timestamp() OR EXISTS(SELECT 1 FROM "DevRecoveryEvent" WHERE "proposalId"=p.id AND kind IN('ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED')) THEN RAISE EXCEPTION 'Proposal no longer pending';END IF;
   IF NEW.kind IN('ACCEPTED','REJECTED') AND p."authorId"=a THEN RAISE EXCEPTION 'Counterparty required';END IF;
   IF NEW.kind='WITHDRAWN' AND p."authorId"<>a THEN RAISE EXCEPTION 'Proposer required for withdrawal';END IF;
   IF NEW.kind='SUPERSEDED' AND NOT EXISTS(SELECT 1 FROM "DevRecoveryProposal" WHERE "supersedesId"=p.id AND "authorId"=a AND "disputeId"=c."disputeId") THEN RAISE EXCEPTION 'New immutable counterproposal required';END IF;
  END IF;
 ELSE
  IF NEW."proposalId" IS NOT NULL THEN RAISE EXCEPTION 'Unexpected proposal reference';END IF;
  IF NEW.kind='NOTICE_VIEWED' THEN SELECT * INTO n FROM "DevRecoveryNotice" WHERE id=NEW."noticeId" AND "disputeId"=c."disputeId";IF n.id IS NULL OR n."recipientId"<>a THEN RAISE EXCEPTION 'Notice recipient required';END IF;
  ELSIF NEW."noticeId" IS NOT NULL THEN RAISE EXCEPTION 'Unexpected notice reference';END IF;
 END IF;
 IF NEW.kind='OPENED' AND NEW.revision<>1 THEN RAISE EXCEPTION 'Initial opening only';END IF;
 IF NEW.kind='MESSAGE' AND(SELECT count(*) FROM "DevRecoveryEvent" WHERE "disputeId"=c."disputeId" AND "actorId"=a AND kind='MESSAGE')>=20 THEN RAISE EXCEPTION 'Message limit';END IF;
 NEW."createdAt":=clock_timestamp();RETURN NEW;
END $$;
CREATE TRIGGER recovery_room_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevRecoveryRoom" FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_guard();
CREATE TRIGGER recovery_proposal_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevRecoveryProposal" FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_guard();
CREATE TRIGGER recovery_event_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevRecoveryEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_guard();
CREATE TRIGGER recovery_notice_guard BEFORE INSERT OR UPDATE OR DELETE ON "DevRecoveryNotice" FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_guard();
CREATE FUNCTION hustlen_recovery_atomic() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r "DevRecoveryRoom";n integer;v integer;
BEGIN
 SELECT * INTO r FROM "DevRecoveryRoom" WHERE "disputeId"=NEW."disputeId";SELECT count(*),max(revision) INTO n,v FROM "DevRecoveryEvent" WHERE "disputeId"=NEW."disputeId";
 IF r."disputeId" IS NULL OR r.revision<>n OR r.revision<>v OR NOT EXISTS(SELECT 1 FROM "DevRecoveryEvent" WHERE "disputeId"=r."disputeId" AND kind='OPENED' AND revision=1) THEN RAISE EXCEPTION 'Atomic room history required';END IF;
 IF EXISTS(SELECT 1 FROM "DevRecoveryEvent" e WHERE e."disputeId"=r."disputeId" AND e.kind NOT IN('OPENED','NOTICE_VIEWED') AND NOT EXISTS(SELECT 1 FROM "DevRecoveryNotice" n WHERE n."eventId"=e.id AND n."disputeId"=e."disputeId")) THEN RAISE EXCEPTION 'Atomic activity notice required';END IF;
 IF EXISTS(SELECT 1 FROM "DevRecoveryProposal" p WHERE p."disputeId"=r."disputeId" AND(NOT EXISTS(SELECT 1 FROM "DevRecoveryEvent" e WHERE e."proposalId"=p.id AND e.kind='PROPOSED' AND e."actorId"=p."authorId") OR (p."supersedesId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "DevRecoveryEvent" e WHERE e."proposalId"=p."supersedesId" AND e.kind='SUPERSEDED' AND e."actorId"=p."authorId")))) THEN RAISE EXCEPTION 'Atomic immutable proposal history required';END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER recovery_room_atomic AFTER INSERT OR UPDATE ON "DevRecoveryRoom" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_atomic();
CREATE CONSTRAINT TRIGGER recovery_proposal_atomic AFTER INSERT ON "DevRecoveryProposal" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_atomic();
CREATE CONSTRAINT TRIGGER recovery_event_atomic AFTER INSERT ON "DevRecoveryEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_atomic();
CREATE CONSTRAINT TRIGGER recovery_notice_atomic AFTER INSERT ON "DevRecoveryNotice" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hustlen_recovery_atomic();
CREATE TRIGGER recovery_room_no_truncate BEFORE TRUNCATE ON "DevRecoveryRoom" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER recovery_proposal_no_truncate BEFORE TRUNCATE ON "DevRecoveryProposal" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER recovery_event_no_truncate BEFORE TRUNCATE ON "DevRecoveryEvent" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE TRIGGER recovery_notice_no_truncate BEFORE TRUNCATE ON "DevRecoveryNotice" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_item_no_truncate_history();
CREATE UNIQUE INDEX recovery_one_assistance ON "DevRecoveryEvent"("disputeId","actorId") WHERE kind='ASSISTANCE_REQUESTED';
CREATE UNIQUE INDEX recovery_one_proposal_event ON "DevRecoveryEvent"("proposalId") WHERE kind='PROPOSED';
COMMIT;
