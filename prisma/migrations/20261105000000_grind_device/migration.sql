CREATE TYPE "GrindDevice" AS ENUM ('MOKA_POT', 'HOME_ESPRESSO', 'SEMI_COMMERCIAL', 'COMMERCIAL');

ALTER TABLE "CartItem" ADD COLUMN "grindDevice" "GrindDevice";
ALTER TABLE "OrderItem" ADD COLUMN "grindDevice" "GrindDevice";

DROP INDEX "CartItem_cartId_productId_grind_key";
CREATE UNIQUE INDEX "CartItem_cartId_productId_grind_grindDevice_key"
  ON "CartItem" ("cartId", "productId", "grind", "grindDevice");
-- PostgreSQL's nullable compound unique index needs a separate no-device case.
CREATE UNIQUE INDEX "CartItem_no_device_key"
  ON "CartItem" ("cartId", "productId", "grind")
  WHERE "grindDevice" IS NULL AND "grind" IS NOT NULL;
-- The existing CartItem_unselected_grind_key continues to cover legacy null grind.
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_device_requires_ground"
  CHECK ("grindDevice" IS NULL OR "grind" IS NOT DISTINCT FROM 'GROUND'::"GrindOption");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_device_requires_ground"
  CHECK ("grindDevice" IS NULL OR "grind" IS NOT DISTINCT FROM 'GROUND'::"GrindOption");
