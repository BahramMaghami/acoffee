ALTER TABLE "Cart" ADD COLUMN "checkoutKey" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Order" ADD COLUMN "checkoutKey" VARCHAR(36);
ALTER TABLE "Order" ADD COLUMN "shippingFeeFinalized" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Cart_checkoutKey_key" ON "Cart"("checkoutKey");
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
