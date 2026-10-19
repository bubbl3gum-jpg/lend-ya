CREATE TABLE "ChatAnalysisJob" (
  "id" SERIAL PRIMARY KEY,
  "messageId" INTEGER NOT NULL REFERENCES "ChatMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "analysisVersion" VARCHAR(32) NOT NULL,
  "contextMessageIds" INTEGER[] NOT NULL,
  "listingTitle" VARCHAR(120) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'WAITING' CHECK ("status" IN ('WAITING','RUNNING','SUCCEEDED','FAILED')),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 3),
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3), "leaseToken" VARCHAR(36), "errorCode" VARCHAR(32),
  "recommendation" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CHECK (cardinality("contextMessageIds") <= 2),
  CHECK (("status"='SUCCEEDED') = ("recommendation" IS NOT NULL)),
  CHECK (("status"='RUNNING') = ("leaseUntil" IS NOT NULL AND "leaseToken" IS NOT NULL))
);
CREATE UNIQUE INDEX "ChatAnalysisJob_messageId_analysisVersion_key" ON "ChatAnalysisJob"("messageId","analysisVersion");
CREATE INDEX "ChatAnalysisJob_status_availableAt_id_idx" ON "ChatAnalysisJob"("status","availableAt","id");
CREATE FUNCTION protect_chat_analysis() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Analysis evidence is immutable'; END IF;
  IF OLD."status" IN ('SUCCEEDED','FAILED') OR
    (NEW."id",NEW."messageId",NEW."analysisVersion",NEW."contextMessageIds",NEW."listingTitle",NEW."createdAt") IS DISTINCT FROM
    (OLD."id",OLD."messageId",OLD."analysisVersion",OLD."contextMessageIds",OLD."listingTitle",OLD."createdAt")
  THEN RAISE EXCEPTION 'Analysis evidence is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_chat_analysis BEFORE UPDATE OR DELETE ON "ChatAnalysisJob" FOR EACH ROW EXECUTE FUNCTION protect_chat_analysis();
