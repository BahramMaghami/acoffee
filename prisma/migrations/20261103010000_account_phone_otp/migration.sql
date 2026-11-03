CREATE TABLE "AccountPhoneOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" VARCHAR(11) NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountPhoneOtp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountPhoneOtp_userId_key" ON "AccountPhoneOtp"("userId");
CREATE INDEX "AccountPhoneOtp_expiresAt_idx" ON "AccountPhoneOtp"("expiresAt");
ALTER TABLE "AccountPhoneOtp" ADD CONSTRAINT "AccountPhoneOtp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
