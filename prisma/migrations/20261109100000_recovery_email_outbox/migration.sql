CREATE TYPE "EmailKind" AS ENUM ('RECOVERY', 'PASSWORD_CHANGED');
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'FAILED', 'CANCELLED');

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "kind" "EmailKind" NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "encryptedPayload" TEXT,
  "recoveryTokenHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "providerId" TEXT,
  "lastErrorCode" TEXT,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX "EmailOutbox_userId_kind_status_idx" ON "EmailOutbox"("userId", "kind", "status");
CREATE INDEX "EmailOutbox_expiresAt_idx" ON "EmailOutbox"("expiresAt");
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailDeliveryHealth" (
  "id" TEXT NOT NULL,
  "heartbeatAt" TIMESTAMP(3) NOT NULL,
  "pausedUntil" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  CONSTRAINT "EmailDeliveryHealth_pkey" PRIMARY KEY ("id")
);
