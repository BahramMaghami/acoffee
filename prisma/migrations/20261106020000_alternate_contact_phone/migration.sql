-- Historical order/address phone values remain unchanged.
ALTER TABLE "Address" ADD COLUMN "alternatePhone" VARCHAR(20);
ALTER TABLE "Order" ADD COLUMN "alternatePhone" VARCHAR(20);
