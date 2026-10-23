BEGIN;

CREATE TABLE "CatalogImport" ("slug" VARCHAR(100) PRIMARY KEY);
CREATE TABLE "Category" (
  "id" TEXT PRIMARY KEY, "slug" VARCHAR(100) NOT NULL UNIQUE, "name" VARCHAR(100) NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "defaultWeights" INTEGER[] NOT NULL,
  "defaultRoasts" TEXT[] NOT NULL, "defaultGrades" TEXT[] NOT NULL,
  "wholesale" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "CatalogProduct" (
  "id" TEXT PRIMARY KEY, "slug" VARCHAR(100) NOT NULL UNIQUE, "name" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL, "origin" TEXT NOT NULL DEFAULT '', "cafeGroup" TEXT,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "weights" INTEGER[] NOT NULL, "roasts" TEXT[] NOT NULL, "grades" TEXT[] NOT NULL,
  "basePrices" JSONB NOT NULL DEFAULT '{}', "imageUrl" TEXT, "imagePublicId" TEXT UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "CatalogProduct_categoryId_sortOrder_idx" ON "CatalogProduct"("categoryId", "sortOrder");
CREATE INDEX "CatalogProduct_isActive_createdAt_idx" ON "CatalogProduct"("isActive", "createdAt");
ALTER TABLE "Product" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "Product" ADD COLUMN "catalogProductId" TEXT REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD COLUMN "roast" TEXT NOT NULL DEFAULT 'default', ADD COLUMN "grade" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN "manualPrice" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Product_catalogProductId_weightGrams_roast_grade_key" ON "Product"("catalogProductId", "weightGrams", "roast", "grade");
ALTER TABLE "Product" ADD CONSTRAINT "Product_discount_check" CHECK ("discountPercent" BETWEEN 0 AND 100);

COMMIT;
