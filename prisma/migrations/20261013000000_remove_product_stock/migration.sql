-- Inventory tracking is deferred. Keep products, prices and order history intact.
BEGIN;
ALTER TABLE "Product" DROP CONSTRAINT "Product_stock_check";
ALTER TABLE "Product" DROP COLUMN "stock";
COMMIT;
