-- Batch 4A: inactive immutable proposals/decisions; no production policy or executor.
BEGIN;
-- CreateEnum
CREATE TYPE "StaffChangeState" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'STALE', 'APPROVED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "StaffReviewRuling" AS ENUM ('REJECT', 'SHADOW_ELIGIBLE', 'APPROVE');

-- CreateTable
CREATE TABLE "StaffChangeRequest" (
    "id" UUID NOT NULL,
    "requesterBindingId" UUID NOT NULL,
    "requesterPersonId" UUID NOT NULL,
    "requesterUserId" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "approvalAction" VARCHAR(100) NOT NULL,
    "risk" VARCHAR(16) NOT NULL DEFAULT 'HIGH',
    "resourceKind" VARCHAR(32) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "correlationId" UUID NOT NULL,
    "currentRevision" INTEGER NOT NULL DEFAULT 0,
    "state" "StaffChangeState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffChangeRevision" (
    "requestId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "resourceId" VARCHAR(128) NOT NULL,
    "audience" VARCHAR(16) NOT NULL,
    "resourceVersion" BIGINT NOT NULL,
    "evidenceVersion" BIGINT NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "approvalPolicyVersion" VARCHAR(80) NOT NULL,
    "requesterAuthorizationVersion" BIGINT NOT NULL,
    "payloadRef" UUID NOT NULL,
    "payloadDigest" VARCHAR(64) NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "canonicalManifest" VARCHAR(4096) NOT NULL,
    "reasonRef" UUID NOT NULL,
    "reasonCode" VARCHAR(32) NOT NULL,
    "evidenceRefs" UUID[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffChangeRevision_pkey" PRIMARY KEY ("requestId","revision")
);

-- CreateTable
CREATE TABLE "StaffApprovalDecision" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "reviewerBindingId" UUID NOT NULL,
    "reviewerPersonId" UUID NOT NULL,
    "reviewerUserId" INTEGER NOT NULL,
    "reviewerAuthorizationVersion" BIGINT NOT NULL,
    "ruling" "StaffReviewRuling" NOT NULL,
    "rationaleRef" UUID NOT NULL,
    "rationaleCode" VARCHAR(32) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffChangeTransition" (
    "id" BIGSERIAL NOT NULL,
    "requestId" UUID NOT NULL,
    "previousState" VARCHAR(16) NOT NULL,
    "newState" VARCHAR(16) NOT NULL,
    "previousRevision" INTEGER NOT NULL,
    "newRevision" INTEGER NOT NULL,
    "databaseActor" VARCHAR(63) NOT NULL DEFAULT CURRENT_USER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffChangeTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffChangeRequest_correlationId_key" ON "StaffChangeRequest"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffChangeRequest_requesterPersonId_idempotencyKey_key" ON "StaffChangeRequest"("requesterPersonId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StaffChangeRevision_requestId_revision_payloadHash_key" ON "StaffChangeRevision"("requestId", "revision", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "StaffApprovalDecision_idempotencyKey_key" ON "StaffApprovalDecision"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StaffApprovalDecision_requestId_revision_key" ON "StaffApprovalDecision"("requestId", "revision");

-- AddForeignKey
ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT "StaffChangeRequest_requesterBindingId_fkey" FOREIGN KEY ("requesterBindingId") REFERENCES "StaffSessionBinding"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffChangeRevision" ADD CONSTRAINT "StaffChangeRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StaffChangeRequest"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffApprovalDecision" ADD CONSTRAINT "StaffApprovalDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StaffChangeRequest"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffApprovalDecision" ADD CONSTRAINT "StaffApprovalDecision_requestId_revision_payloadHash_fkey" FOREIGN KEY ("requestId", "revision", "payloadHash") REFERENCES "StaffChangeRevision"("requestId", "revision", "payloadHash") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffApprovalDecision" ADD CONSTRAINT "StaffApprovalDecision_reviewerBindingId_fkey" FOREIGN KEY ("reviewerBindingId") REFERENCES "StaffSessionBinding"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffChangeTransition" ADD CONSTRAINT "StaffChangeTransition_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StaffChangeRequest"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT staff_change_inactive CHECK (state NOT IN ('APPROVED','EXECUTED'));
ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT staff_change_header_shape CHECK (risk='HIGH' AND "currentRevision">=0);
ALTER TABLE "StaffChangeRevision" ADD CONSTRAINT staff_change_revision_shape CHECK (
 "payloadDigest" ~ '^[a-f0-9]{64}$' AND revision>0 AND "resourceVersion">0 AND "evidenceVersion">0 AND "requesterAuthorizationVersion">0 AND
 "policyVersion"='hustlen-admin-shadow-v1' AND "approvalPolicyVersion"='hustlen-approval-foundation-v1' AND
 "resourceId" ~ '^([1-9][0-9]{0,9}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$' AND
 audience IN ('CASE_ONLY','PLATFORM') AND "reasonCode" IN ('SAFETY_REVIEW','POLICY_REVIEW','DISPUTE_REVIEW') AND cardinality("evidenceRefs") BETWEEN 1 AND 16 AND array_position("evidenceRefs",NULL) IS NULL AND
 "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '1 hour' AND
 "payloadHash"=encode(sha256(convert_to("canonicalManifest",'UTF8')),'hex') AND "canonicalManifest"=("canonicalManifest"::jsonb)::text);
ALTER TABLE "StaffApprovalDecision" ADD CONSTRAINT staff_decision_inactive CHECK (ruling<>'APPROVE' AND "reviewerAuthorizationVersion">0 AND "rationaleCode" IN ('INDEPENDENT_REVIEW','POLICY_UNRESOLVED','SCOPE_CONFLICT'));

CREATE FUNCTION hustlen_approval_header_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE binding public."StaffSessionBinding"%ROWTYPE; association public."StaffAccountAssociation"%ROWTYPE; definition public."StaffCapabilityContract"%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Approval history cannot be deleted'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO STRICT binding FROM public."StaffSessionBinding" WHERE id=NEW."requesterBindingId";
  SELECT * INTO STRICT association FROM public."StaffAccountAssociation" WHERE id=binding."associationId";
  IF NEW."requesterPersonId"<>association."personId" OR NEW."requesterUserId"<>association."userId" OR binding.state<>'PENDING' OR association.state<>'VERIFIED' OR binding."expiresAt"<=clock_timestamp() THEN RAISE EXCEPTION 'Requester attribution mismatch'; END IF;
  SELECT * INTO STRICT definition FROM public."StaffCapabilityContract" WHERE action=NEW.action AND "policyVersion"='hustlen-admin-shadow-v1';
  IF definition.risk<>'HIGH' OR definition."blockedPolicy" OR right(NEW.action,8)<>'.request' OR NEW."approvalAction"<>left(NEW.action,length(NEW.action)-8)||'.approve' OR NEW."resourceKind"<>definition."resourceKind" OR NOT EXISTS(SELECT 1 FROM public."StaffCapabilityContract" WHERE action=NEW."approvalAction" AND risk='HIGH' AND "resourceKind"=NEW."resourceKind") OR NEW.state<>'DRAFT' OR NEW."currentRevision"<>0 THEN RAISE EXCEPTION 'Canonical inactive request contract required'; END IF;
 ELSE
  IF (to_jsonb(NEW)-'state'-'currentRevision') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'currentRevision') THEN RAISE EXCEPTION 'Approval header attribution/action cannot change'; END IF;
  IF OLD.state IN ('CANCELLED','EXPIRED','APPROVED','EXECUTED') THEN RAISE EXCEPTION 'Terminal request'; END IF;
  IF NEW."currentRevision"<>OLD."currentRevision" THEN
   IF NEW."currentRevision"<>OLD."currentRevision"+1 OR NEW.state<>'DRAFT' OR NOT EXISTS(SELECT 1 FROM public."StaffChangeRevision" WHERE "requestId"=OLD.id AND revision=NEW."currentRevision") THEN RAISE EXCEPTION 'New immutable revision required'; END IF;
  ELSE
   IF NOT ((OLD.state='DRAFT' AND NEW.state IN ('SUBMITTED','CANCELLED','EXPIRED','STALE')) OR (OLD.state='SUBMITTED' AND NEW.state IN ('REJECTED','CANCELLED','EXPIRED','STALE')) OR (OLD.state IN ('REJECTED','STALE') AND NEW.state IN ('CANCELLED','EXPIRED'))) THEN RAISE EXCEPTION 'Invalid inactive lifecycle transition'; END IF;
   IF NEW.state='SUBMITTED' AND NOT EXISTS(SELECT 1 FROM public."StaffChangeRevision" WHERE "requestId"=OLD.id AND revision=OLD."currentRevision" AND "expiresAt">clock_timestamp()) THEN RAISE EXCEPTION 'Current unexpired revision required'; END IF;
   IF NEW.state='EXPIRED' AND NOT EXISTS(SELECT 1 FROM public."StaffChangeRevision" WHERE "requestId"=OLD.id AND revision=OLD."currentRevision" AND "expiresAt"<=clock_timestamp()) THEN RAISE EXCEPTION 'Expiry is server-derived'; END IF;
   IF NEW.state='REJECTED' AND NOT EXISTS(SELECT 1 FROM public."StaffApprovalDecision" WHERE "requestId"=OLD.id AND revision=OLD."currentRevision" AND ruling='REJECT') THEN RAISE EXCEPTION 'Rejection requires an immutable decision'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_change_header BEFORE INSERT OR UPDATE OR DELETE ON "StaffChangeRequest" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_header_validate();

CREATE FUNCTION hustlen_approval_revision_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE head public."StaffChangeRequest"%ROWTYPE; binding public."StaffSessionBinding"%ROWTYPE; payload jsonb;
BEGIN
 SELECT * INTO STRICT head FROM public."StaffChangeRequest" WHERE id=NEW."requestId" FOR UPDATE;
 SELECT * INTO STRICT binding FROM public."StaffSessionBinding" WHERE id=head."requesterBindingId";
 IF head.state NOT IN ('DRAFT','SUBMITTED','REJECTED','STALE') OR NEW.revision<>head."currentRevision"+1 OR NEW."requesterAuthorizationVersion"<>binding."authorizationVersion" THEN RAISE EXCEPTION 'Stale request revision'; END IF;
 payload:=NEW."canonicalManifest"::jsonb;
 IF payload IS DISTINCT FROM jsonb_build_object('action',head.action,'resourceKind',head."resourceKind",'resourceId',NEW."resourceId",'audience',NEW.audience,'resourceVersion',NEW."resourceVersion"::text,'evidenceVersion',NEW."evidenceVersion"::text,'policyVersion',NEW."policyVersion",'approvalPolicyVersion',NEW."approvalPolicyVersion",'requesterAuthorizationVersion',NEW."requesterAuthorizationVersion"::text,'payloadRef',NEW."payloadRef"::text,'payloadDigest',NEW."payloadDigest",'reasonRef',NEW."reasonRef"::text,'reasonCode',NEW."reasonCode",'evidenceRefs',to_jsonb(NEW."evidenceRefs"),'expiresAt',payload->>'expiresAt','revision',NEW.revision,'intent','PROPOSED_CHANGE_REFERENCE') OR ((payload->>'expiresAt')::timestamptz AT TIME ZONE 'UTC') IS DISTINCT FROM NEW."expiresAt" THEN RAISE EXCEPTION 'Manifest must bind exact reference-only immutable change'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_change_revision_validate BEFORE INSERT ON "StaffChangeRevision" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_revision_validate();
CREATE FUNCTION hustlen_approval_revision_advance() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN UPDATE public."StaffChangeRequest" SET "currentRevision"=NEW.revision,state='DRAFT' WHERE id=NEW."requestId"; RETURN NEW; END $$;
CREATE TRIGGER staff_change_revision_advance AFTER INSERT ON "StaffChangeRevision" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_revision_advance();

CREATE FUNCTION hustlen_approval_decision_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE head public."StaffChangeRequest"%ROWTYPE; revision_row public."StaffChangeRevision"%ROWTYPE; binding public."StaffSessionBinding"%ROWTYPE; association public."StaffAccountAssociation"%ROWTYPE;
BEGIN
 IF current_database() !~ '^hustlen_test_[a-z0-9_]+$' OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^hustlen-mrt-test:[a-f0-9]{24}$') THEN RAISE EXCEPTION 'Decisions are isolated hypotheses only'; END IF;
 SELECT * INTO STRICT head FROM public."StaffChangeRequest" WHERE id=NEW."requestId" FOR UPDATE;
 SELECT * INTO STRICT revision_row FROM public."StaffChangeRevision" WHERE "requestId"=NEW."requestId" AND revision=NEW.revision;
 SELECT * INTO STRICT binding FROM public."StaffSessionBinding" WHERE id=NEW."reviewerBindingId";
 SELECT * INTO STRICT association FROM public."StaffAccountAssociation" WHERE id=binding."associationId";
 IF head.state<>'SUBMITTED' OR head."currentRevision"<>NEW.revision OR revision_row."expiresAt"<=clock_timestamp() OR NEW."payloadHash"<>revision_row."payloadHash" OR association."personId"=head."requesterPersonId" OR association."personId"<>NEW."reviewerPersonId" OR association."userId"<>NEW."reviewerUserId" OR binding."authorizationVersion"<>NEW."reviewerAuthorizationVersion" OR binding.state<>'PENDING' OR binding."expiresAt"<=clock_timestamp() OR NOT EXISTS(SELECT 1 FROM public."StaffAuthorizationVersion" WHERE "personId"=association."personId" AND version=binding."authorizationVersion") THEN RAISE EXCEPTION 'Stale/nonindependent hypothetical decision'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_approval_decision_validate BEFORE INSERT ON "StaffApprovalDecision" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_decision_validate();
CREATE FUNCTION hustlen_approval_decision_reject() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN IF NEW.ruling='REJECT' THEN UPDATE public."StaffChangeRequest" SET state='REJECTED' WHERE id=NEW."requestId"; END IF; RETURN NEW; END $$;
CREATE TRIGGER staff_approval_decision_reject AFTER INSERT ON "StaffApprovalDecision" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_decision_reject();
CREATE FUNCTION hustlen_approval_transition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN INSERT INTO public."StaffChangeTransition" ("requestId","previousState","newState","previousRevision","newRevision") VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN '' ELSE OLD.state::text END,NEW.state::text,CASE WHEN TG_OP='INSERT' THEN 0 ELSE OLD."currentRevision" END,NEW."currentRevision"); RETURN NEW; END $$;
CREATE TRIGGER staff_change_transition AFTER INSERT OR UPDATE ON "StaffChangeRequest" FOR EACH ROW EXECUTE FUNCTION hustlen_approval_transition();
CREATE TRIGGER staff_change_transition_internal BEFORE INSERT ON "StaffChangeTransition" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_internal_write();
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['StaffChangeRevision','StaffApprovalDecision','StaffChangeTransition'] LOOP
  EXECUTE format('CREATE TRIGGER staff_approval_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['StaffChangeRequest','StaffChangeRevision','StaffApprovalDecision','StaffChangeTransition'] LOOP
  EXECUTE format('CREATE TRIGGER staff_approval_no_truncate BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate()',tbl);
 END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON "StaffChangeRequest","StaffChangeRevision","StaffApprovalDecision","StaffChangeTransition" FROM PUBLIC;
COMMIT;
