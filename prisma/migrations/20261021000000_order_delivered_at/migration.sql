-- Existing delivery times are unknown; do not fabricate historical dates.
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMPTZ(3);
