-- Batch 3A: additive, inert human staff identity foundation. No legacy updates.
BEGIN;

-- CreateEnum
CREATE TYPE "StaffHumanVerification" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "StaffFixedRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'MODERATOR');

-- CreateEnum
CREATE TYPE "StaffMembershipState" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StaffGrantState" AS ENUM ('DRAFT', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StaffAssociationState" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "StaffGrantScope" AS ENUM ('RESOURCE', 'ASSIGNED_CASE', 'CASE_QUEUE', 'PRIVATE_CHANNEL', 'LAB');

-- CreateTable
CREATE TABLE "StaffPerson" (
    "id" UUID NOT NULL,
    "verification" "StaffHumanVerification" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationSubjectHash" VARCHAR(64),
    "verificationRef" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAccountAssociation" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "state" "StaffAssociationState" NOT NULL DEFAULT 'PENDING',
    "provenanceRef" UUID NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAccountAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMembership" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "role" "StaffFixedRole" NOT NULL,
    "state" "StaffMembershipState" NOT NULL DEFAULT 'DRAFT',
    "proposedByPersonId" UUID NOT NULL,
    "provenanceRef" UUID NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAuthorizationVersion" (
    "personId" UUID NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "policyVersion" VARCHAR(80) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAuthorizationVersion_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "StaffCapabilityContract" (
    "action" VARCHAR(100) NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "resourceKind" VARCHAR(32) NOT NULL,
    "risk" VARCHAR(16) NOT NULL,
    "scope" "StaffGrantScope" NOT NULL,
    "eligibleRoles" "StaffFixedRole"[],
    "blockedPolicy" BOOLEAN NOT NULL,
    "evidence" BOOLEAN NOT NULL,

    CONSTRAINT "StaffCapabilityContract_pkey" PRIMARY KEY ("action","policyVersion")
);

-- CreateTable
CREATE TABLE "StaffCapabilityGrant" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "state" "StaffGrantState" NOT NULL DEFAULT 'DRAFT',
    "scope" "StaffGrantScope" NOT NULL,
    "resourceKind" VARCHAR(32) NOT NULL,
    "resourceId" VARCHAR(128) NOT NULL,
    "caseId" VARCHAR(128),
    "channelAudience" VARCHAR(16),
    "purposeCode" VARCHAR(32) NOT NULL,
    "issuedByPersonId" UUID NOT NULL,
    "provenanceRef" UUID NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAuthorizationEvent" (
    "id" BIGSERIAL NOT NULL,
    "personId" UUID NOT NULL,
    "authorizationVersion" BIGINT NOT NULL,
    "entityKind" VARCHAR(32) NOT NULL,
    "entityId" UUID NOT NULL,
    "operation" VARCHAR(16) NOT NULL,
    "databaseActor" VARCHAR(63) NOT NULL DEFAULT CURRENT_USER,
    "provenanceRef" UUID,
    "previousState" JSONB NOT NULL,
    "newState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAuthorizationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffPerson_verificationSubjectHash_key" ON "StaffPerson"("verificationSubjectHash");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccountAssociation_userId_key" ON "StaffAccountAssociation"("userId");

-- CreateIndex
CREATE INDEX "StaffAccountAssociation_personId_idx" ON "StaffAccountAssociation"("personId");

-- CreateIndex
CREATE INDEX "StaffMembership_personId_state_idx" ON "StaffMembership"("personId", "state");

-- CreateIndex
CREATE INDEX "StaffCapabilityGrant_membershipId_state_idx" ON "StaffCapabilityGrant"("membershipId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAuthorizationEvent_personId_authorizationVersion_key" ON "StaffAuthorizationEvent"("personId", "authorizationVersion");

-- AddForeignKey
ALTER TABLE "StaffAccountAssociation" ADD CONSTRAINT "StaffAccountAssociation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffAccountAssociation" ADD CONSTRAINT "StaffAccountAssociation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_proposedByPersonId_fkey" FOREIGN KEY ("proposedByPersonId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffAuthorizationVersion" ADD CONSTRAINT "StaffAuthorizationVersion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffCapabilityGrant" ADD CONSTRAINT "StaffCapabilityGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StaffMembership"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffCapabilityGrant" ADD CONSTRAINT "StaffCapabilityGrant_action_policyVersion_fkey" FOREIGN KEY ("action", "policyVersion") REFERENCES "StaffCapabilityContract"("action", "policyVersion") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffCapabilityGrant" ADD CONSTRAINT "StaffCapabilityGrant_issuedByPersonId_fkey" FOREIGN KEY ("issuedByPersonId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffAuthorizationEvent" ADD CONSTRAINT "StaffAuthorizationEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "StaffPerson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Reserved future ACTIVE states cannot be used until a separately reviewed
-- forward migration and complete DAL cutover. This is not a feature flag.
ALTER TABLE "StaffMembership" ADD CONSTRAINT staff_membership_inactive_only CHECK (state <> 'ACTIVE');
ALTER TABLE "StaffCapabilityGrant" ADD CONSTRAINT staff_grant_inactive_only CHECK (state <> 'ACTIVE');
CREATE UNIQUE INDEX staff_one_active_membership ON "StaffMembership" ("personId") WHERE state='ACTIVE';
CREATE UNIQUE INDEX staff_one_open_membership ON "StaffMembership" ("personId") WHERE state IN ('DRAFT','ACTIVE','SUSPENDED');
ALTER TABLE "StaffPerson" ADD CONSTRAINT staff_verified_identity CHECK (
 (verification='UNVERIFIED' AND "verificationSubjectHash" IS NULL AND "verificationRef" IS NULL AND "verifiedAt" IS NULL) OR
 (verification IN ('VERIFIED','REVOKED') AND "verificationSubjectHash" IS NOT NULL AND "verificationSubjectHash" ~ '^[a-f0-9]{64}$' AND "verificationRef" IS NOT NULL AND "verifiedAt" IS NOT NULL));
ALTER TABLE "StaffAccountAssociation" ADD CONSTRAINT staff_association_verification CHECK ((state='PENDING' AND "verifiedAt" IS NULL) OR (state='VERIFIED' AND "verifiedAt" IS NOT NULL) OR state='REVOKED');
ALTER TABLE "StaffMembership" ADD CONSTRAINT staff_membership_bounds CHECK ("expiresAt">"validFrom" AND "expiresAt"<="validFrom"+interval '365 days' AND "policyVersion"='hustlen-admin-shadow-v1' AND "proposedByPersonId"<>"personId");
ALTER TABLE "StaffAuthorizationVersion" ADD CONSTRAINT staff_positive_version CHECK (version>0 AND "policyVersion"='hustlen-admin-shadow-v1');
ALTER TABLE "StaffCapabilityGrant" ADD CONSTRAINT staff_grant_bounds CHECK (
 "expiresAt">"validFrom" AND "expiresAt"<="validFrom"+interval '30 days' AND
 "resourceId" ~ '^[A-Za-z0-9_.:-]{1,128}$' AND
 ("caseId" IS NULL OR "caseId" ~ '^[A-Za-z0-9_.:-]{1,128}$') AND
 "purposeCode" IN ('CASE_INVESTIGATION','INDEPENDENT_REVIEW','OPERATIONS_METADATA','AUTHORIZED_WORK_ITEM') AND
 ((scope IN ('ASSIGNED_CASE','CASE_QUEUE','PRIVATE_CHANNEL') AND "caseId" IS NOT NULL) OR scope IN ('RESOURCE','LAB')) AND
 ((scope='PRIVATE_CHANNEL' AND "channelAudience" IS NOT NULL AND "channelAudience" IN ('OWNER','BORROWER')) OR (scope<>'PRIVATE_CHANNEL' AND "channelAudience" IS NULL)));

-- Frozen shadow-policy metadata only. No person, membership or grant is seeded.
INSERT INTO "StaffCapabilityContract" (action,"policyVersion","resourceKind",risk,scope,"eligibleRoles","blockedPolicy",evidence) VALUES
('overview.read','hustlen-admin-shadow-v1','platform','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('bookings.read','hustlen-admin-shadow-v1','booking','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('bookings.internal_tag.write','hustlen-admin-shadow-v1','booking','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],true,false),
('bookings.followup.assign','hustlen-admin-shadow-v1','booking','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],true,false),
('bookings.alert.acknowledge','hustlen-admin-shadow-v1','booking','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],true,false),
('bookings.status.write','hustlen-admin-shadow-v1','booking','FORBIDDEN','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('disputes.investigate','hustlen-admin-shadow-v1','dispute','READ','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,true),
('disputes.recommend','hustlen-admin-shadow-v1','dispute','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,false),
('disputes.resolution.request','hustlen-admin-shadow-v1','dispute','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('disputes.resolution.approve','hustlen-admin-shadow-v1','dispute','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('custody_incidents.recommend','hustlen-admin-shadow-v1','booking','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],true,false),
('custody_incidents.resolution.request','hustlen-admin-shadow-v1','booking','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],true,false),
('custody_incidents.resolution.approve','hustlen-admin-shadow-v1','booking','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],true,false),
('listings.read','hustlen-admin-shadow-v1','listing','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('listings.restrict','hustlen-admin-shadow-v1','listing','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','MODERATOR']::"StaffFixedRole"[],false,false),
('listings.restore','hustlen-admin-shadow-v1','listing','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','MODERATOR']::"StaffFixedRole"[],false,false),
('listings.restriction.request','hustlen-admin-shadow-v1','listing','LOW','ASSIGNED_CASE',ARRAY['SUPPORT']::"StaffFixedRole"[],false,false),
('listing_reports.review','hustlen-admin-shadow-v1','report','READ','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','MODERATOR']::"StaffFixedRole"[],false,true),
('locations.read','hustlen-admin-shadow-v1','location','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('locations.suspend','hustlen-admin-shadow-v1','location','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],false,false),
('locations.suspension.request','hustlen-admin-shadow-v1','location','LOW','RESOURCE',ARRAY['SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('locations.restore.request','hustlen-admin-shadow-v1','location','HIGH','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],false,false),
('locations.restore.approve','hustlen-admin-shadow-v1','location','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('geofence_policy.change.request','hustlen-admin-shadow-v1','location','HIGH','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],false,false),
('geofence_policy.change.approve','hustlen-admin-shadow-v1','location','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('geofence_lab.use','hustlen-admin-shadow-v1','lab','LOW','LAB',ARRAY['SUPER_ADMIN','OPERATIONS']::"StaffFixedRole"[],false,false),
('users.directory.read','hustlen-admin-shadow-v1','user','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('users.temporary_safety_restrict','hustlen-admin-shadow-v1','user','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],true,false),
('users.temporary_safety_release','hustlen-admin-shadow-v1','user','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],true,false),
('users.serious_sanction.request','hustlen-admin-shadow-v1','user','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('users.serious_sanction.approve','hustlen-admin-shadow-v1','user','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('users.serious_sanction_restore.request','hustlen-admin-shadow-v1','user','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('users.serious_sanction_restore.approve','hustlen-admin-shadow-v1','user','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('support.queue.read','hustlen-admin-shadow-v1','ticket','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('support.ticket.assign','hustlen-admin-shadow-v1','ticket','LOW','RESOURCE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('support.channel.read','hustlen-admin-shadow-v1','support_channel','READ','PRIVATE_CHANNEL',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,true),
('support.channel.write','hustlen-admin-shadow-v1','support_channel','LOW','PRIVATE_CHANNEL',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('support.internal_notes.write','hustlen-admin-shadow-v1','ticket','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('support.mediation.routine_share','hustlen-admin-shadow-v1','ticket','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],true,false),
('support.mediation.sensitive_share.request','hustlen-admin-shadow-v1','ticket','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('support.mediation.sensitive_share.approve','hustlen-admin-shadow-v1','ticket','HIGH','ASSIGNED_CASE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('support.ticket.close','hustlen-admin-shadow-v1','ticket','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','SUPPORT']::"StaffFixedRole"[],false,false),
('chat_cases.queue_claim','hustlen-admin-shadow-v1','chat_case','LOW','CASE_QUEUE',ARRAY['SUPER_ADMIN','MODERATOR']::"StaffFixedRole"[],false,false),
('chat_cases.evidence.read','hustlen-admin-shadow-v1','chat_case','READ','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','MODERATOR']::"StaffFixedRole"[],false,true),
('chat_cases.routine_decision','hustlen-admin-shadow-v1','chat_case','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','MODERATOR']::"StaffFixedRole"[],false,false),
('chat_cases.appeal_decision','hustlen-admin-shadow-v1','chat_case','LOW','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','MODERATOR']::"StaffFixedRole"[],false,false),
('chat_cases.reassign','hustlen-admin-shadow-v1','chat_case','LOW','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('evidence.rental_case.read','hustlen-admin-shadow-v1','dispute','READ','ASSIGNED_CASE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,true),
('evidence.export','hustlen-admin-shadow-v1','dispute','FORBIDDEN','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('evidence.modify','hustlen-admin-shadow-v1','dispute','FORBIDDEN','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('announcements.draft','hustlen-admin-shadow-v1','announcement','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('announcements.routine.publish','hustlen-admin-shadow-v1','announcement','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,false),
('announcements.high_impact.request','hustlen-admin-shadow-v1','announcement','HIGH','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('announcements.high_impact.approve','hustlen-admin-shadow-v1','announcement','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('announcements.emergency_high_impact.request','hustlen-admin-shadow-v1','announcement','HIGH','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,false),
('announcements.emergency_high_impact.approve','hustlen-admin-shadow-v1','announcement','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('settings.low_risk.write','hustlen-admin-shadow-v1','setting','LOW','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],true,false),
('settings.high_risk.change.request','hustlen-admin-shadow-v1','setting','HIGH','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT']::"StaffFixedRole"[],false,false),
('settings.high_risk.change.approve','hustlen-admin-shadow-v1','setting','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.staff_grant_revoke.request','hustlen-admin-shadow-v1','staff','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.staff_grant_revoke.approve','hustlen-admin-shadow-v1','staff','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.policy_change.request','hustlen-admin-shadow-v1','platform','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.policy_change.approve','hustlen-admin-shadow-v1','platform','HIGH','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.access_review','hustlen-admin-shadow-v1','staff','READ','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('security.session_revoke','hustlen-admin-shadow-v1','user','LOW','RESOURCE',ARRAY['SUPER_ADMIN']::"StaffFixedRole"[],false,false),
('approvals.queue.read','hustlen-admin-shadow-v1','platform','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('audit.read','hustlen-admin-shadow-v1','audit','READ','RESOURCE',ARRAY['SUPER_ADMIN','OPERATIONS','SUPPORT','MODERATOR']::"StaffFixedRole"[],false,false),
('audit.update_delete','hustlen-admin-shadow-v1','audit','FORBIDDEN','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('security.disable_invariants','hustlen-admin-shadow-v1','platform','FORBIDDEN','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('payments.move_funds','hustlen-admin-shadow-v1','platform','DEFERRED','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('ai.assist.summarize','hustlen-admin-shadow-v1','platform','DEFERRED','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('ai.assist.classify','hustlen-admin-shadow-v1','platform','DEFERRED','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('ai.credentials.issue','hustlen-admin-shadow-v1','platform','DEFERRED','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false),
('ai.autonomous_admin','hustlen-admin-shadow-v1','platform','DEFERRED','RESOURCE',ARRAY[]::"StaffFixedRole"[],false,false);

CREATE FUNCTION hustlen_staff_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Staff foundation record is immutable'; END $$;
CREATE FUNCTION hustlen_staff_no_populated_truncate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE populated boolean;
BEGIN
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',TG_TABLE_NAME) INTO populated;
 IF populated THEN RAISE EXCEPTION 'Populated staff records cannot be truncated'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER staff_contract_immutable BEFORE INSERT OR UPDATE OR DELETE ON "StaffCapabilityContract" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable();
CREATE TRIGGER staff_event_immutable BEFORE UPDATE OR DELETE ON "StaffAuthorizationEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable();
CREATE FUNCTION hustlen_staff_internal_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth()<2 OR TG_OP='DELETE' THEN RAISE EXCEPTION 'Staff versions/history are trigger maintained'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_event_internal BEFORE INSERT ON "StaffAuthorizationEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_internal_write();
CREATE TRIGGER staff_version_internal BEFORE INSERT OR UPDATE OR DELETE ON "StaffAuthorizationVersion" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_internal_write();

CREATE FUNCTION hustlen_staff_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE subject_id uuid; membership_record public."StaffMembership"%ROWTYPE; definition public."StaffCapabilityContract"%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Staff identity and grant history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  -- Only lifecycle state/verification may change. All identity/role/scope/provenance
  -- bindings remain immutable; corrections need a separate reviewed procedure.
  IF TG_TABLE_NAME='StaffPerson' THEN
   IF NEW.id<>OLD.id OR NEW."createdAt"<>OLD."createdAt" OR OLD.verification='REVOKED' OR
    (OLD.verification='VERIFIED' AND (NEW.verification NOT IN ('VERIFIED','REVOKED') OR
     ROW(NEW."verificationSubjectHash",NEW."verificationRef",NEW."verifiedAt") IS DISTINCT FROM ROW(OLD."verificationSubjectHash",OLD."verificationRef",OLD."verifiedAt"))) THEN RAISE EXCEPTION 'Verified human identity cannot be rebound'; END IF;
  ELSE
   IF (to_jsonb(NEW)-'state'-'verifiedAt') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'verifiedAt') OR OLD.state::text IN ('REVOKED','EXPIRED') THEN RAISE EXCEPTION 'Staff binding/scope/role cannot be rewritten'; END IF;
   IF TG_TABLE_NAME<>'StaffAccountAssociation' AND to_jsonb(NEW)->'verifiedAt' IS DISTINCT FROM to_jsonb(OLD)->'verifiedAt' THEN RAISE EXCEPTION 'Unexpected verification change'; END IF;
   IF TG_TABLE_NAME='StaffAccountAssociation' AND OLD.state::text='VERIFIED' AND (NEW.state::text NOT IN ('VERIFIED','REVOKED') OR to_jsonb(NEW)->'verifiedAt' IS DISTINCT FROM to_jsonb(OLD)->'verifiedAt') THEN RAISE EXCEPTION 'Verified account association cannot be reset'; END IF;
  END IF;
 END IF;
 IF TG_TABLE_NAME='StaffPerson' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='StaffCapabilityGrant' THEN
  SELECT * INTO STRICT membership_record FROM public."StaffMembership" WHERE id=NEW."membershipId" FOR UPDATE;
  subject_id:=membership_record."personId";
 ELSE subject_id:=NEW."personId"; END IF;
 PERFORM 1 FROM public."StaffPerson" WHERE id=subject_id FOR UPDATE;
 IF TG_TABLE_NAME='StaffAccountAssociation' THEN
  IF NEW.state='VERIFIED' AND NOT EXISTS (SELECT 1 FROM public."StaffPerson" WHERE id=subject_id AND verification='VERIFIED') THEN RAISE EXCEPTION 'Verified human required for account association'; END IF;
 ELSIF TG_TABLE_NAME='StaffMembership' THEN
  IF NEW.state NOT IN ('REVOKED','EXPIRED') AND (NOT EXISTS (SELECT 1 FROM public."StaffPerson" WHERE id=subject_id AND verification='VERIFIED') OR NOT EXISTS (SELECT 1 FROM public."StaffPerson" WHERE id=NEW."proposedByPersonId" AND verification='VERIFIED')) THEN RAISE EXCEPTION 'Independent verified proposer and subject required'; END IF;
 ELSIF TG_TABLE_NAME='StaffCapabilityGrant' THEN
  IF NEW."issuedByPersonId"=subject_id THEN RAISE EXCEPTION 'Self/alias grants are forbidden'; END IF;
  IF TG_OP='INSERT' THEN
   SELECT * INTO STRICT definition FROM public."StaffCapabilityContract" WHERE action=NEW.action AND "policyVersion"=NEW."policyVersion";
   IF membership_record.state<>'DRAFT' OR membership_record."policyVersion"<>NEW."policyVersion" OR
    NEW."validFrom"<membership_record."validFrom" OR NEW."expiresAt">membership_record."expiresAt" OR
    NOT EXISTS (SELECT 1 FROM public."StaffPerson" WHERE id=subject_id AND verification='VERIFIED') OR
    NOT EXISTS (SELECT 1 FROM public."StaffPerson" WHERE id=NEW."issuedByPersonId" AND verification='VERIFIED') OR
    NOT membership_record.role=ANY(definition."eligibleRoles") OR definition."blockedPolicy" OR definition.risk IN ('FORBIDDEN','DEFERRED') OR
    NEW.scope<>definition.scope OR NEW."resourceKind"<>definition."resourceKind" OR
    (definition.evidence AND NEW."purposeCode" NOT IN ('CASE_INVESTIGATION','INDEPENDENT_REVIEW')) THEN RAISE EXCEPTION 'Grant does not satisfy bounded shadow contract'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION hustlen_staff_record_change() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE subject_id uuid; next_version bigint; before_state jsonb; after_state jsonb;
BEGIN
 IF TG_TABLE_NAME='StaffPerson' THEN subject_id:=NEW.id;
 ELSIF TG_TABLE_NAME='StaffCapabilityGrant' THEN SELECT "personId" INTO STRICT subject_id FROM public."StaffMembership" WHERE id=NEW."membershipId";
 ELSE subject_id:=NEW."personId"; END IF;
 IF TG_TABLE_NAME='StaffPerson' AND TG_OP='INSERT' THEN
  INSERT INTO public."StaffAuthorizationVersion" ("personId",version,"policyVersion") VALUES(subject_id,1,'hustlen-admin-shadow-v1') RETURNING version INTO next_version;
 ELSE
  UPDATE public."StaffAuthorizationVersion" SET version=version+1,"updatedAt"=CURRENT_TIMESTAMP WHERE "personId"=subject_id RETURNING version INTO STRICT next_version;
 END IF;
 -- Only bounded state/role/capability metadata. No identity proof, hash, case body,
 -- tokens, coordinates or arbitrary free-text JSON snapshots in this ledger.
 before_state:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object('state',to_jsonb(OLD)->'state','verification',to_jsonb(OLD)->'verification','role',to_jsonb(OLD)->'role','action',to_jsonb(OLD)->'action')) END;
 after_state:=jsonb_strip_nulls(jsonb_build_object('state',to_jsonb(NEW)->'state','verification',to_jsonb(NEW)->'verification','role',to_jsonb(NEW)->'role','action',to_jsonb(NEW)->'action'));
 INSERT INTO public."StaffAuthorizationEvent" ("personId","authorizationVersion","entityKind","entityId",operation,"provenanceRef","previousState","newState") VALUES(subject_id,next_version,TG_TABLE_NAME,NEW.id,TG_OP,coalesce(to_jsonb(NEW)->>'provenanceRef',to_jsonb(NEW)->>'verificationRef')::uuid,before_state,after_state);
 RETURN NEW;
END $$;

DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['StaffPerson','StaffAccountAssociation','StaffMembership','StaffCapabilityGrant'] LOOP
  EXECUTE format('CREATE TRIGGER staff_validate BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION hustlen_staff_validate()',tbl);
  EXECUTE format('CREATE TRIGGER staff_history AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION hustlen_staff_record_change()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['StaffPerson','StaffAccountAssociation','StaffMembership','StaffCapabilityGrant','StaffAuthorizationVersion','StaffAuthorizationEvent','StaffCapabilityContract'] LOOP
  EXECUTE format('CREATE TRIGGER staff_no_truncate BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate()',tbl);
 END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "StaffAuthorizationEvent","StaffAuthorizationVersion","StaffCapabilityContract" FROM PUBLIC;
COMMIT;
