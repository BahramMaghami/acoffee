-- Preserve all existing prices, badges and order snapshots. No backfill.
ALTER TABLE "Product" ADD COLUMN "originalPrice" DECIMAL(14,0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_originalPrice_check"
  CHECK ("originalPrice" IS NULL OR ("price" IS NOT NULL AND "price" > 0 AND "originalPrice" > "price"));
