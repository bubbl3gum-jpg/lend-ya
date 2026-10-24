-- Batch 3C: no live sessions, no legacy updates, no staff seeded.
BEGIN;
-- CreateEnum
CREATE TYPE "StaffPendingState" AS ENUM ('PENDING', 'REVOKED');

-- CreateEnum
CREATE TYPE "StaffSecurityOutcome" AS ENUM ('DENIED', 'FAILED', 'SHADOW_COMMITTED', 'COMMITTED');

-- CreateTable
CREATE TABLE "StaffStepUpRecord" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "authSessionId" INTEGER NOT NULL,
    "authSessionCreatedAt" TIMESTAMP(3) NOT NULL,
    "assurance" VARCHAR(16) NOT NULL,
    "issuerRef" UUID NOT NULL,
    "proofRef" UUID NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" "StaffPendingState" NOT NULL DEFAULT 'PENDING',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffStepUpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSessionBinding" (
    "id" UUID NOT NULL,
    "authSessionId" INTEGER NOT NULL,
    "authSessionCreatedAt" TIMESTAMP(3) NOT NULL,
    "associationId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "stepUpId" UUID NOT NULL,
    "authorizationVersion" BIGINT NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" "StaffPendingState" NOT NULL DEFAULT 'PENDING',
    "revokedAt" TIMESTAMP(3),
    "provenanceRef" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSessionBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSecurityEvent" (
    "id" BIGSERIAL NOT NULL,
    "correlationId" UUID NOT NULL,
    "bindingId" UUID,
    "personId" UUID,
    "userId" INTEGER,
    "authSessionId" INTEGER,
    "membershipId" UUID,
    "authorizationVersion" BIGINT,
    "policyVersion" VARCHAR(80) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resourceKind" VARCHAR(32) NOT NULL,
    "resourceId" VARCHAR(128),
    "caseId" VARCHAR(128),
    "evidenceId" UUID,
    "outcome" "StaffSecurityOutcome" NOT NULL,
    "reasonCode" VARCHAR(32) NOT NULL,
    "databaseActor" VARCHAR(63) NOT NULL DEFAULT CURRENT_USER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffStepUpRecord_proofRef_key" ON "StaffStepUpRecord"("proofRef");

-- CreateIndex
CREATE INDEX "StaffSessionBinding_authSessionId_state_idx" ON "StaffSessionBinding"("authSessionId", "state");

-- CreateIndex
CREATE INDEX "StaffSecurityEvent_correlationId_idx" ON "StaffSecurityEvent"("correlationId");

-- CreateIndex
CREATE INDEX "StaffSecurityEvent_personId_createdAt_idx" ON "StaffSecurityEvent"("personId", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffStepUpRecord" ADD CONSTRAINT "StaffStepUpRecord_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffSessionBinding" ADD CONSTRAINT "StaffSessionBinding_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffSessionBinding" ADD CONSTRAINT "StaffSessionBinding_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StaffMembership"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffSessionBinding" ADD CONSTRAINT "StaffSessionBinding_stepUpId_fkey" FOREIGN KEY ("stepUpId") REFERENCES "StaffStepUpRecord"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffSecurityEvent" ADD CONSTRAINT "StaffSecurityEvent_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "StaffSessionBinding"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Pending is an inspection state, not an activation flag or MFA proof verifier.
CREATE UNIQUE INDEX staff_one_pending_session_binding ON "StaffSessionBinding" ("authSessionId") WHERE state='PENDING';
ALTER TABLE "StaffStepUpRecord" ADD CONSTRAINT staff_step_up_bounds CHECK (assurance='MFA' AND "expiresAt">"authenticatedAt" AND "expiresAt"<="authenticatedAt"+interval '15 minutes' AND ((state='PENDING' AND "revokedAt" IS NULL) OR (state='REVOKED' AND "revokedAt" IS NOT NULL)));
ALTER TABLE "StaffSessionBinding" ADD CONSTRAINT staff_pending_binding_bounds CHECK ("authorizationVersion">0 AND "policyVersion"='hustlen-admin-shadow-v1' AND "expiresAt">"createdAt" AND ((state='PENDING' AND "revokedAt" IS NULL) OR (state='REVOKED' AND "revokedAt" IS NOT NULL)));
ALTER TABLE "StaffSecurityEvent" ADD CONSTRAINT staff_no_live_success CHECK (outcome<>'COMMITTED');
ALTER TABLE "StaffSecurityEvent" ADD CONSTRAINT staff_security_event_shape CHECK (
 "policyVersion"='hustlen-admin-shadow-v1' AND
 "reasonCode" IN ('AUTHORITY_INACTIVE','SHADOW_READ','ACCESS_DENIED','ACCESS_FAILED') AND
 ("resourceId" IS NULL OR "resourceId" ~ '^[1-9][0-9]{0,9}$' OR "resourceId" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') AND
 ("caseId" IS NULL OR "caseId" ~ '^[1-9][0-9]{0,9}$' OR "caseId" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') AND
 (("bindingId" IS NULL AND "personId" IS NULL AND "userId" IS NULL AND "authSessionId" IS NULL AND "membershipId" IS NULL AND "authorizationVersion" IS NULL) OR
 ("bindingId" IS NOT NULL AND "personId" IS NOT NULL AND "userId" IS NOT NULL AND "authSessionId" IS NOT NULL AND "membershipId" IS NOT NULL AND "authorizationVersion">0)) AND
 ((outcome='SHADOW_COMMITTED' AND "bindingId" IS NOT NULL AND "reasonCode"='SHADOW_READ') OR (outcome IN ('DENIED','FAILED') AND "reasonCode"<>'SHADOW_READ')));

CREATE FUNCTION hustlen_staff_pending_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE association public."StaffAccountAssociation"%ROWTYPE; member public."StaffMembership"%ROWTYPE; step public."StaffStepUpRecord"%ROWTYPE; session_expiry timestamp; bound_account_id integer; bound_session_created_at timestamp;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Pending staff attribution history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.state='REVOKED' OR (to_jsonb(NEW)-'state'-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'revokedAt') OR NEW.state<>'REVOKED' THEN RAISE EXCEPTION 'Pending staff records are immutable except terminal revocation'; END IF;
  NEW."revokedAt":=clock_timestamp(); RETURN NEW;
 END IF;
 SELECT * INTO STRICT association FROM public."StaffAccountAssociation" WHERE id=NEW."associationId";
 SELECT "userId","expiresAt","createdAt" INTO STRICT bound_account_id,session_expiry,bound_session_created_at FROM public."AuthSession" WHERE id=NEW."authSessionId";
 IF NEW."authSessionCreatedAt"<>bound_session_created_at OR association.state<>'VERIFIED' OR association."userId"<>bound_account_id OR NOT EXISTS(SELECT 1 FROM public."StaffPerson" WHERE id=association."personId" AND verification='VERIFIED') OR NOT EXISTS(SELECT 1 FROM public."User" WHERE id=bound_account_id AND "accountStatus"='ACTIVE') THEN RAISE EXCEPTION 'Authenticated verified account binding required'; END IF;
 IF TG_TABLE_NAME='StaffStepUpRecord' THEN
  IF NEW.state<>'PENDING' OR NEW."authenticatedAt">clock_timestamp() OR NEW."expiresAt">session_expiry OR NEW."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Invalid pending step-up window'; END IF;
 ELSE
  SELECT * INTO STRICT member FROM public."StaffMembership" WHERE id=NEW."membershipId";
  SELECT * INTO STRICT step FROM public."StaffStepUpRecord" WHERE id=NEW."stepUpId";
  IF NEW.state<>'PENDING' OR member.state<>'DRAFT' OR member."personId"<>association."personId" OR member."policyVersion"<>NEW."policyVersion" OR member."validFrom">clock_timestamp() OR member."expiresAt"<NEW."expiresAt" OR step.state<>'PENDING' OR step."associationId"<>NEW."associationId" OR step."authSessionId"<>NEW."authSessionId" OR step."authSessionCreatedAt"<>NEW."authSessionCreatedAt" OR NEW."expiresAt">step."expiresAt" OR NEW."expiresAt">session_expiry OR NEW."expiresAt"<=clock_timestamp() OR NOT EXISTS(SELECT 1 FROM public."StaffAuthorizationVersion" WHERE "personId"=association."personId" AND version=NEW."authorizationVersion" AND "policyVersion"=NEW."policyVersion") THEN RAISE EXCEPTION 'Pending session identity/version/window mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_pending_validate BEFORE INSERT OR UPDATE OR DELETE ON "StaffStepUpRecord" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_pending_validate();
CREATE TRIGGER staff_pending_validate BEFORE INSERT OR UPDATE OR DELETE ON "StaffSessionBinding" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_pending_validate();

CREATE FUNCTION hustlen_staff_security_event_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE bound public."StaffSessionBinding"%ROWTYPE; association public."StaffAccountAssociation"%ROWTYPE;
BEGIN
 IF NEW."databaseActor"<>CURRENT_USER THEN RAISE EXCEPTION 'Database actor cannot be forged'; END IF;
 IF NEW."bindingId" IS NOT NULL THEN
  SELECT * INTO STRICT bound FROM public."StaffSessionBinding" WHERE id=NEW."bindingId";
  SELECT * INTO STRICT association FROM public."StaffAccountAssociation" WHERE id=bound."associationId";
  IF (NEW."personId" IS NOT NULL AND NEW."personId"<>association."personId") OR (NEW."userId" IS NOT NULL AND NEW."userId"<>association."userId") OR (NEW."authSessionId" IS NOT NULL AND NEW."authSessionId"<>bound."authSessionId") OR (NEW."membershipId" IS NOT NULL AND NEW."membershipId"<>bound."membershipId") OR (NEW."authorizationVersion" IS NOT NULL AND NEW."authorizationVersion"<>bound."authorizationVersion") THEN RAISE EXCEPTION 'Actor attribution mismatch'; END IF;
  NEW."personId":=association."personId"; NEW."userId":=association."userId"; NEW."authSessionId":=bound."authSessionId"; NEW."membershipId":=bound."membershipId"; NEW."authorizationVersion":=bound."authorizationVersion";
  IF NEW.outcome='SHADOW_COMMITTED' AND (bound.state<>'PENDING' OR bound."expiresAt"<=clock_timestamp() OR association.state<>'VERIFIED' OR NOT EXISTS(SELECT 1 FROM public."StaffAuthorizationVersion" WHERE "personId"=association."personId" AND version=bound."authorizationVersion")) THEN RAISE EXCEPTION 'Stale pending attribution'; END IF;
 END IF;
 IF NEW.outcome='SHADOW_COMMITTED' AND NOT EXISTS (
  SELECT 1 FROM public."StaffCapabilityContract" contract
  JOIN public."StaffMembership" member ON member.id=bound."membershipId"
  JOIN public."StaffCapabilityGrant" grant_record ON grant_record."membershipId"=member.id
  JOIN public."StaffStepUpRecord" step ON step.id=bound."stepUpId"
  JOIN public."AuthSession" session_record ON session_record.id=bound."authSessionId"
  JOIN public."User" account ON account.id=association."userId"
  JOIN public."StaffPerson" human ON human.id=association."personId"
  WHERE contract.action=NEW.action AND contract."policyVersion"=NEW."policyVersion" AND contract.risk='READ' AND NOT contract."blockedPolicy"
   AND member.role=ANY(contract."eligibleRoles") AND member.state='DRAFT' AND member."personId"=association."personId" AND member."policyVersion"=NEW."policyVersion" AND member."validFrom"<=clock_timestamp() AND member."expiresAt">clock_timestamp()
   AND grant_record.action=NEW.action AND grant_record.state='DRAFT' AND grant_record."policyVersion"=NEW."policyVersion" AND grant_record."resourceId"=NEW."resourceId" AND grant_record."resourceKind"=NEW."resourceKind" AND grant_record.scope=contract.scope AND grant_record."validFrom"<=clock_timestamp() AND grant_record."expiresAt">clock_timestamp()
   AND (contract.scope='RESOURCE' OR (NEW."caseId" IS NOT NULL AND grant_record."caseId"=NEW."caseId"))
   AND (NEW.action<>'evidence.rental_case.read' OR NEW."evidenceId" IS NOT NULL)
   AND step.state='PENDING' AND step."expiresAt">clock_timestamp() AND step."associationId"=bound."associationId" AND step."authSessionId"=bound."authSessionId"
   AND session_record."createdAt"=bound."authSessionCreatedAt" AND step."authSessionCreatedAt"=bound."authSessionCreatedAt" AND session_record."userId"=association."userId" AND session_record."expiresAt">clock_timestamp() AND account."accountStatus"='ACTIVE' AND human.verification='VERIFIED'
 ) THEN RAISE EXCEPTION 'Shadow event requires current bounded pending chain'; END IF;
 IF NEW.action='security.unknown_action' THEN
  IF NEW."resourceKind"<>'UNKNOWN' OR NEW."resourceId" IS NOT NULL OR NEW.outcome='SHADOW_COMMITTED' THEN RAISE EXCEPTION 'Unknown actions cannot claim resource access'; END IF;
 ELSIF NOT EXISTS(SELECT 1 FROM public."StaffCapabilityContract" WHERE action=NEW.action AND "policyVersion"=NEW."policyVersion" AND "resourceKind"=NEW."resourceKind") THEN RAISE EXCEPTION 'Unknown action/resource contract'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_security_event_validate BEFORE INSERT ON "StaffSecurityEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_security_event_validate();
CREATE TRIGGER staff_security_event_immutable BEFORE UPDATE OR DELETE ON "StaffSecurityEvent" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable();
CREATE TRIGGER staff_security_event_no_truncate BEFORE TRUNCATE ON "StaffSecurityEvent" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate();
CREATE TRIGGER staff_step_up_no_truncate BEFORE TRUNCATE ON "StaffStepUpRecord" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate();
CREATE TRIGGER staff_binding_no_truncate BEFORE TRUNCATE ON "StaffSessionBinding" FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate();
-- Session IDs are durable attribution references, deliberately NOT AuthSession FKs:
-- existing logout/session deletion and user-session cascade behavior remain intact.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON "StaffStepUpRecord","StaffSessionBinding","StaffSecurityEvent" FROM PUBLIC;
COMMIT;
