CREATE TABLE "PasswordRecovery" (
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordRecovery_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "PasswordRecovery_tokenHash_key" ON "PasswordRecovery"("tokenHash");
CREATE INDEX "PasswordRecovery_expiresAt_idx" ON "PasswordRecovery"("expiresAt");
ALTER TABLE "PasswordRecovery" ADD CONSTRAINT "PasswordRecovery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PasswordRecoveryRequest" (
    "id" SERIAL NOT NULL,
    "emailHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordRecoveryRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PasswordRecoveryRequest_emailHash_createdAt_idx" ON "PasswordRecoveryRequest"("emailHash", "createdAt");
CREATE INDEX "PasswordRecoveryRequest_ipHash_createdAt_idx" ON "PasswordRecoveryRequest"("ipHash", "createdAt");
CREATE INDEX "PasswordRecoveryRequest_createdAt_idx" ON "PasswordRecoveryRequest"("createdAt");
