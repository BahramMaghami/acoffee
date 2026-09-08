CREATE TABLE "AuthRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "resetsAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "AuthRateLimit_attempts_check" CHECK ("attempts" > 0)
);

CREATE INDEX "AuthRateLimit_resetsAt_idx" ON "AuthRateLimit"("resetsAt");
