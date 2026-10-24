-- Batch 5A: factor verification only; no staff activation, no enrollment seed.
BEGIN;
-- CreateEnum
CREATE TYPE "StaffMfaPurpose" AS ENUM ('ENROLL', 'STEP_UP');

-- CreateEnum
CREATE TYPE "StaffMfaChallengeState" AS ENUM ('PENDING', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffMfaEventKind" AS ENUM ('ENROLLMENT_STARTED', 'ENROLLED', 'CHALLENGE_CANCELLED', 'AUTHENTICATION_STARTED', 'VERIFIED', 'DENIED', 'CREDENTIAL_REVOKED', 'RECOVERY_BLOCKED');

-- CreateTable
CREATE TABLE "StaffMfaVersion" (
    "associationId" UUID NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "StaffMfaVersion_pkey" PRIMARY KEY ("associationId")
);

-- CreateTable
CREATE TABLE "StaffMfaCredential" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "credentialId" VARCHAR(1400) NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "rpId" VARCHAR(253) NOT NULL,
    "deviceType" VARCHAR(16) NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StaffMfaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMfaChallenge" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "authSessionId" INTEGER NOT NULL,
    "authSessionCreatedAt" TIMESTAMP(3) NOT NULL,
    "authorizationVersion" BIGINT NOT NULL,
    "mfaVersion" BIGINT NOT NULL,
    "challengeHash" VARCHAR(64) NOT NULL,
    "configHash" VARCHAR(64) NOT NULL,
    "purpose" "StaffMfaPurpose" NOT NULL,
    "state" "StaffMfaChallengeState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMfaAssurance" (
    "id" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "credentialKey" UUID NOT NULL,
    "authSessionId" INTEGER NOT NULL,
    "authSessionCreatedAt" TIMESTAMP(3) NOT NULL,
    "authorizationVersion" BIGINT NOT NULL,
    "mfaVersion" BIGINT NOT NULL,
    "policyVersion" VARCHAR(80) NOT NULL,
    "configHash" VARCHAR(64) NOT NULL,
    "assertionDigest" VARCHAR(64) NOT NULL,
    "assurance" VARCHAR(16) NOT NULL DEFAULT 'WEBAUTHN_UV',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMfaAssurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMfaEvent" (
    "id" BIGSERIAL NOT NULL,
    "correlationId" UUID NOT NULL,
    "associationId" UUID NOT NULL,
    "authSessionId" INTEGER NOT NULL,
    "authSessionCreatedAt" TIMESTAMP(3) NOT NULL,
    "kind" "StaffMfaEventKind" NOT NULL,
    "challengeId" UUID,
    "credentialKey" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMfaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMfaRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMfaRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMfaCredential_credentialId_key" ON "StaffMfaCredential"("credentialId");

-- CreateIndex
CREATE INDEX "StaffMfaCredential_associationId_revokedAt_idx" ON "StaffMfaCredential"("associationId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMfaChallenge_challengeHash_key" ON "StaffMfaChallenge"("challengeHash");

-- CreateIndex
CREATE INDEX "StaffMfaChallenge_associationId_expiresAt_idx" ON "StaffMfaChallenge"("associationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMfaAssurance_assertionDigest_key" ON "StaffMfaAssurance"("assertionDigest");

-- AddForeignKey
ALTER TABLE "StaffMfaVersion" ADD CONSTRAINT "StaffMfaVersion_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMfaCredential" ADD CONSTRAINT "StaffMfaCredential_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMfaChallenge" ADD CONSTRAINT "StaffMfaChallenge_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMfaAssurance" ADD CONSTRAINT "StaffMfaAssurance_credentialKey_fkey" FOREIGN KEY ("credentialKey") REFERENCES "StaffMfaCredential"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMfaAssurance" ADD CONSTRAINT "StaffMfaAssurance_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffMfaEvent" ADD CONSTRAINT "StaffMfaEvent_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "StaffAccountAssociation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "StaffMfaVersion" ADD CONSTRAINT staff_mfa_positive_version CHECK(version>0);
ALTER TABLE "StaffMfaCredential" ADD CONSTRAINT staff_mfa_credential_shape CHECK(counter BETWEEN 0 AND 4294967295 AND length("publicKey") BETWEEN 32 AND 4096 AND length("credentialId") BETWEEN 16 AND 1400 AND "credentialId" ~ '^[A-Za-z0-9_-]+$' AND "deviceType" IN ('singleDevice','multiDevice'));
ALTER TABLE "StaffMfaChallenge" ADD CONSTRAINT staff_mfa_challenge_bounds CHECK("authorizationVersion">0 AND "mfaVersion">0 AND "challengeHash" ~ '^[a-f0-9]{64}$' AND "configHash" ~ '^[a-f0-9]{64}$' AND attempts BETWEEN 0 AND 5 AND "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '5 minutes');
ALTER TABLE "StaffMfaAssurance" ADD CONSTRAINT staff_mfa_assurance_bounds CHECK("authorizationVersion">0 AND "mfaVersion">0 AND assurance='WEBAUTHN_UV' AND "policyVersion"='hustlen-admin-shadow-v1' AND "assertionDigest" ~ '^[a-f0-9]{64}$' AND "configHash" ~ '^[a-f0-9]{64}$' AND "expiresAt">"verifiedAt" AND "expiresAt"<="verifiedAt"+interval '5 minutes');
CREATE FUNCTION hustlen_mfa_credential_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'counter'-'backedUp'-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'counter'-'backedUp'-'revokedAt') OR OLD."revokedAt" IS NOT NULL OR NEW.counter<OLD.counter THEN RAISE EXCEPTION 'MFA identity/key cannot be rebound or revived'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_mfa_key_immutable BEFORE UPDATE OR DELETE ON "StaffMfaCredential" FOR EACH ROW EXECUTE FUNCTION hustlen_mfa_credential_immutable();
CREATE FUNCTION hustlen_mfa_challenge_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'state'-'attempts') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'attempts') OR OLD.state<>'PENDING' OR NEW.attempts<OLD.attempts THEN RAISE EXCEPTION 'MFA challenge cannot be rebound or replayed'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER staff_mfa_challenge_immutable BEFORE UPDATE OR DELETE ON "StaffMfaChallenge" FOR EACH ROW EXECUTE FUNCTION hustlen_mfa_challenge_immutable();
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['StaffMfaAssurance','StaffMfaEvent'] LOOP
  EXECUTE format('CREATE TRIGGER staff_mfa_append_only BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable()',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['StaffMfaCredential','StaffMfaVersion','StaffMfaChallenge','StaffMfaAssurance','StaffMfaEvent'] LOOP
  EXECUTE format('CREATE TRIGGER staff_mfa_no_truncate BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_no_populated_truncate()',tbl);
 END LOOP;
END $$;
-- No AuthSession FKs: logout/deletion/expiry semantics remain intact; the service
-- rechecks the exact session ID AND creation timestamp on every factor use.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON "StaffMfaCredential","StaffMfaVersion","StaffMfaChallenge","StaffMfaAssurance","StaffMfaEvent" FROM PUBLIC;
COMMIT;
