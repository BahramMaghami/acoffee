CREATE TYPE "DiscountCodeType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "DiscountCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" VARCHAR(10) NOT NULL,
  "type" "DiscountCodeType" NOT NULL,
  "value" DECIMAL(14,0) NOT NULL,
  "maxUsers" INTEGER NOT NULL,
  "maxUsesPerUser" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "DiscountCode_limits_check" CHECK ("maxUsers" > 0 AND "maxUsesPerUser" > 0 AND "value" > 0 AND ("type" <> 'PERCENT' OR "value" <= 100)),
  CONSTRAINT "DiscountCode_format_check" CHECK ("code" ~ '^[A-Z2-9]{10}$')
);
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_createdAt_idx" ON "DiscountCode"("createdAt");

ALTER TABLE "Order" ADD COLUMN "discountCode" VARCHAR(10),
  ADD COLUMN "discountCodeType" "DiscountCodeType",
  ADD COLUMN "discountCodeValue" DECIMAL(14,0);

CREATE TABLE "DiscountRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "discountCodeId" TEXT NOT NULL REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userId" TEXT NOT NULL,
  "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "amount" DECIMAL(14,0) NOT NULL CHECK ("amount" > 0),
  "consumedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DiscountRedemption_orderId_key" ON "DiscountRedemption"("orderId");
CREATE INDEX "DiscountRedemption_discountCodeId_userId_idx" ON "DiscountRedemption"("discountCodeId", "userId");
