-- Forward-only inbox ordering. Existing messages/evidence are untouched.
ALTER TABLE "Conversation" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Conversation" c SET "lastActivityAt" = COALESCE((SELECT MAX(m."createdAt") FROM "ChatMessage" m WHERE m."conversationId"=c.id), c."createdAt");
CREATE INDEX "Conversation_lastActivityAt_id_idx" ON "Conversation"("lastActivityAt", "id");
