BEGIN;
-- Historical amounts, statuses and coupon uses remain untouched.
-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'LIVE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ZARINPAL', 'MANUAL', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('REQUESTING', 'PENDING', 'VERIFYING', 'UNKNOWN', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DiscountReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

-- AlterTable
ALTER TABLE "DiscountRedemption" ADD COLUMN     "environment" "PaymentEnvironment";

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "repriceSourceId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentEnvironment" "PaymentEnvironment",
ADD COLUMN     "paymentExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "repricedFromId" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "DiscountReservation" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "status" "DiscountReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DiscountReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "environment" "PaymentEnvironment" NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL,
    "amountRial" DECIMAL(16,0) NOT NULL,
    "merchantId" VARCHAR(36),
    "authority" VARCHAR(36),
    "referenceId" VARCHAR(100),
    "errorCode" VARCHAR(80),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "leaseToken" VARCHAR(36),
    "leaseUntil" TIMESTAMPTZ(3),
    "verificationStartedAt" TIMESTAMPTZ(3),
    "settledAt" TIMESTAMPTZ(3),
    "actorId" TEXT,
    "actorName" VARCHAR(100),
    "note" VARCHAR(500),
    "voidedAt" TIMESTAMPTZ(3),
    "voidedById" TEXT,
    "voidedByName" VARCHAR(100),
    "voidReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountReservation_orderId_key" ON "DiscountReservation"("orderId");

-- CreateIndex
CREATE INDEX "DiscountReservation_discountCodeId_environment_status_userI_idx" ON "DiscountReservation"("discountCodeId", "environment", "status", "userId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_environment_status_updatedAt_idx" ON "PaymentAttempt"("environment", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_environment_authority_key" ON "PaymentAttempt"("environment", "authority");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_environment_merchantId_referenceId_key" ON "PaymentAttempt"("environment", "merchantId", "referenceId");

-- AddForeignKey
ALTER TABLE "DiscountReservation" ADD CONSTRAINT "DiscountReservation_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountReservation" ADD CONSTRAINT "DiscountReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_repricedFromId_fkey" FOREIGN KEY ("repricedFromId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_amount_check" CHECK ("amountRial" >= 0);
ALTER TABLE "DiscountReservation" ADD CONSTRAINT "DiscountReservation_amount_check" CHECK ("amount" > 0);
CREATE UNIQUE INDEX "PaymentAttempt_one_open_per_order" ON "PaymentAttempt"("orderId")
  WHERE "status" IN ('REQUESTING', 'PENDING', 'VERIFYING', 'UNKNOWN');
CREATE UNIQUE INDEX "PaymentAttempt_one_settlement_per_order" ON "PaymentAttempt"("orderId") WHERE "status" = 'SUCCEEDED';
COMMIT;
