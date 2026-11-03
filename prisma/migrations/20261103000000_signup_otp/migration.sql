ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(11), ADD COLUMN "phoneVerifiedAt" TIMESTAMPTZ(3);
CREATE INDEX "User_phone_idx" ON "User"("phone");

CREATE TABLE "SignupOtp" (
  "id" TEXT NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "phone" VARCHAR(11) NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignupOtp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SignupOtp_email_key" ON "SignupOtp"("email");
CREATE INDEX "SignupOtp_expiresAt_idx" ON "SignupOtp"("expiresAt");
