CREATE TYPE "GrindOption" AS ENUM ('WHOLE_BEAN', 'GROUND');
CREATE TYPE "ShippingMethod" AS ENUM ('POST', 'TIPAX', 'COURIER', 'PICKUP');

ALTER TABLE "Product" ADD COLUMN "grindOptions" "GrindOption"[] NOT NULL DEFAULT ARRAY['WHOLE_BEAN', 'GROUND']::"GrindOption"[];
ALTER TABLE "CartItem" ADD COLUMN "grind" "GrindOption";
ALTER TABLE "OrderItem" ADD COLUMN "grind" "GrindOption";
ALTER TABLE "Order" ADD COLUMN "shippingMethod" "ShippingMethod";

DROP INDEX "CartItem_cartId_productId_key";
CREATE UNIQUE INDEX "CartItem_cartId_productId_grind_key" ON "CartItem"("cartId", "productId", "grind");
-- Preserve uniqueness for existing unselected cart lines as well.
CREATE UNIQUE INDEX "CartItem_unselected_grind_key" ON "CartItem"("cartId", "productId") WHERE "grind" IS NULL;
