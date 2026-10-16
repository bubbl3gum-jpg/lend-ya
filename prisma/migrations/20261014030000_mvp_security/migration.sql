CREATE TABLE "AuthRateLimit" ("key" VARCHAR(64) PRIMARY KEY, "attempts" INTEGER NOT NULL CHECK ("attempts">0), "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
