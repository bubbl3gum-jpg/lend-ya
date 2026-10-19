-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('ALLOWED', 'FLAGGED', 'HELD', 'REJECTED');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastReadSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "clientMessageId" VARCHAR(128) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "normalizedHash" VARCHAR(64) NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "updatedSequence" INTEGER NOT NULL,
    "deliverySequence" INTEGER,
    "status" "ChatMessageStatus" NOT NULL,
    "categories" TEXT[],
    "ruleCodes" TEXT[],
    "policyVersion" VARCHAR(32) NOT NULL,
    "bookingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "ChatReviewer" (
    "userId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReviewer_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ChatModerationCase" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "messageId" INTEGER,
    "targetUserId" INTEGER NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "category" VARCHAR(40) NOT NULL,
    "reporterId" INTEGER,
    "reportReason" VARCHAR(1000),
    "evidence" JSONB NOT NULL,
    "assignedTo" INTEGER,
    "decision" VARCHAR(24),
    "decisionReason" VARCHAR(2000),
    "decisionCategory" VARCHAR(40),
    "version" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "dedupKey" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ChatModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "messageId" INTEGER,
    "reporterId" INTEGER NOT NULL,
    "caseId" INTEGER NOT NULL,
    "dedupKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWarning" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRateLimit" (
    "key" VARCHAR(100) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ChatOutboxEvent" (
    "id" SERIAL NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "dedupKey" VARCHAR(160) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ChatOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_ownerId_id_idx" ON "Conversation"("ownerId", "id");

-- CreateIndex
CREATE INDEX "Conversation_borrowerId_id_idx" ON "Conversation"("borrowerId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_listingId_ownerId_borrowerId_key" ON "Conversation"("listingId", "ownerId", "borrowerId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_conversationId_idx" ON "ConversationParticipant"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_updatedSequence_idx" ON "ChatMessage"("conversationId", "updatedSequence");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_deliverySequence_idx" ON "ChatMessage"("conversationId", "deliverySequence");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_createdAt_idx" ON "ChatMessage"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_senderId_clientMessageId_key" ON "ChatMessage"("senderId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_sequence_key" ON "ChatMessage"("conversationId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ChatModerationCase_parentId_key" ON "ChatModerationCase"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatModerationCase_dedupKey_key" ON "ChatModerationCase"("dedupKey");

-- CreateIndex
CREATE INDEX "ChatModerationCase_status_id_idx" ON "ChatModerationCase"("status", "id");

-- CreateIndex
CREATE INDEX "ChatModerationCase_assignedTo_status_id_idx" ON "ChatModerationCase"("assignedTo", "status", "id");

-- CreateIndex
CREATE INDEX "ChatModerationCase_targetUserId_id_idx" ON "ChatModerationCase"("targetUserId", "id");

-- CreateIndex
CREATE INDEX "ChatModerationCase_reporterId_id_idx" ON "ChatModerationCase"("reporterId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReport_dedupKey_key" ON "MessageReport"("dedupKey");

-- CreateIndex
CREATE INDEX "MessageReport_reporterId_createdAt_idx" ON "MessageReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatWarning_userId_id_idx" ON "ChatWarning"("userId", "id");

-- CreateIndex
CREATE INDEX "ChatRateLimit_expiresAt_idx" ON "ChatRateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatOutboxEvent_dedupKey_key" ON "ChatOutboxEvent"("dedupKey");

-- CreateIndex
CREATE INDEX "ChatOutboxEvent_processedAt_id_idx" ON "ChatOutboxEvent"("processedAt", "id");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReviewer" ADD CONSTRAINT "ChatReviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatModerationCase_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatModerationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ChatModerationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatWarning" ADD CONSTRAINT "ChatWarning_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ChatModerationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatWarning" ADD CONSTRAINT "ChatWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Defense in depth: existing rental tables and migration records are not changed.
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_distinct_participants" CHECK ("ownerId" <> "borrowerId" AND "version" >= 0);
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "Participant_read_cursor" CHECK ("lastReadSequence" >= 0);
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_distinct" CHECK ("blockerId" <> "blockedId");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_limits" CHECK (length(btrim(body)) BETWEEN 1 AND 4000 AND sequence > 0 AND "updatedSequence" >= sequence AND ((status IN ('ALLOWED','FLAGGED') AND "deliverySequence" IS NOT NULL) OR (status IN ('HELD','REJECTED') AND "deliverySequence" IS NULL)));
ALTER TABLE "ChatModerationCase" ADD CONSTRAINT "ChatCase_state" CHECK (status IN ('OPEN','DECIDED') AND kind IN ('SYSTEM','REPORT','APPEAL','COORDINATION') AND jsonb_typeof(evidence->'messages')='array' AND jsonb_array_length(evidence->'messages') <= 5);
ALTER TABLE "ChatRateLimit" ADD CONSTRAINT "ChatRateLimit_positive" CHECK (attempts > 0);
CREATE FUNCTION preserve_chat_message_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Chat evidence deletion requires approved retention policy'; END IF;
 IF ROW(NEW.body,NEW."contentHash",NEW."normalizedHash",NEW."requestHash",NEW."conversationId",NEW."senderId",NEW."clientMessageId",NEW.sequence,NEW."bookingId",NEW."createdAt",NEW.categories,NEW."ruleCodes",NEW."policyVersion") IS DISTINCT FROM ROW(OLD.body,OLD."contentHash",OLD."normalizedHash",OLD."requestHash",OLD."conversationId",OLD."senderId",OLD."clientMessageId",OLD.sequence,OLD."bookingId",OLD."createdAt",OLD.categories,OLD."ruleCodes",OLD."policyVersion") THEN RAISE EXCEPTION 'Original chat evidence is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER chat_message_immutable BEFORE UPDATE OR DELETE ON "ChatMessage" FOR EACH ROW EXECUTE FUNCTION preserve_chat_message_evidence();
CREATE FUNCTION preserve_chat_case_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Chat cases are retained'; END IF;
 IF ROW(NEW."conversationId",NEW."messageId",NEW."targetUserId",NEW.kind,NEW.category,NEW."reporterId",NEW."reportReason",NEW.evidence,NEW."parentId",NEW."dedupKey",NEW."createdAt") IS DISTINCT FROM ROW(OLD."conversationId",OLD."messageId",OLD."targetUserId",OLD.kind,OLD.category,OLD."reporterId",OLD."reportReason",OLD.evidence,OLD."parentId",OLD."dedupKey",OLD."createdAt") OR OLD.status='DECIDED' THEN RAISE EXCEPTION 'Case evidence and completed decisions are immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER chat_case_immutable BEFORE UPDATE OR DELETE ON "ChatModerationCase" FOR EACH ROW EXECUTE FUNCTION preserve_chat_case_evidence();
CREATE TRIGGER chat_report_immutable BEFORE UPDATE OR DELETE ON "MessageReport" FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_rewrite();
CREATE TRIGGER chat_warning_immutable BEFORE UPDATE OR DELETE ON "ChatWarning" FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_rewrite();

ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
