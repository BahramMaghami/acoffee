import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('grind-device migration preserves legacy rows and enforces preparation uniqueness', { skip: !hasTestDatabase, timeout: 90000 }, async () => {
  const urls = testDatabaseUrls()
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled, connectionTimeoutMillis: 15000 }) })
  const schema = `grind_test_${randomUUID().replaceAll('-', '')}`
  const rollback = new Error('Rollback test schema')
  const migration = await readFile(new URL('../../prisma/migrations/20261105000000_grind_device/migration.sql', import.meta.url), 'utf8')
  try {
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`)
      await tx.$executeRawUnsafe(`CREATE TYPE "GrindOption" AS ENUM ('WHOLE_BEAN', 'GROUND')`)
      await tx.$executeRawUnsafe(`CREATE TABLE "CartItem" ("id" text PRIMARY KEY, "cartId" text NOT NULL, "productId" text NOT NULL, "grind" "GrindOption", "quantity" int NOT NULL DEFAULT 1)`)
      await tx.$executeRawUnsafe(`CREATE TABLE "OrderItem" ("id" text PRIMARY KEY, "grind" "GrindOption", "unitPrice" numeric NOT NULL)`)
      await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "CartItem_cartId_productId_grind_key" ON "CartItem" ("cartId", "productId", "grind")`)
      await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "CartItem_unselected_grind_key" ON "CartItem" ("cartId", "productId") WHERE "grind" IS NULL`)
      await tx.$executeRawUnsafe(`INSERT INTO "CartItem" ("id", "cartId", "productId", "grind", "quantity") VALUES ('legacy', 'cart', 'sku', NULL, 2), ('whole', 'cart', 'sku', 'WHOLE_BEAN', 3), ('ground', 'cart', 'sku', 'GROUND', 4)`)
      await tx.$executeRawUnsafe(`INSERT INTO "OrderItem" VALUES ('historic', 'GROUND', 125000)`)
      for (const statement of migration.split(';').map(part => part.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement)
      assert.equal(await tx.$queryRawUnsafe(`SELECT "grindDevice" FROM "OrderItem" WHERE "id" = 'historic'`).then(rows => (rows as { grindDevice: unknown }[])[0].grindDevice), null)
      const legacy = await tx.$queryRawUnsafe<{ quantity: number; grindDevice: null }[]>(`SELECT "quantity", "grindDevice" FROM "CartItem" ORDER BY "quantity"`)
      assert.deepEqual(legacy, [{ quantity: 2, grindDevice: null }, { quantity: 3, grindDevice: null }, { quantity: 4, grindDevice: null }])
      assert.equal(Number((await tx.$queryRawUnsafe<{ unitPrice: unknown }[]>(`SELECT "unitPrice" FROM "OrderItem"`))[0].unitPrice), 125000)
      await tx.$executeRawUnsafe(`INSERT INTO "CartItem" ("id", "cartId", "productId", "grind", "grindDevice") VALUES ('moka', 'cart', 'sku', 'GROUND', 'MOKA_POT'), ('home', 'cart', 'sku', 'GROUND', 'HOME_ESPRESSO')`)
      // Expected violations are handled inside PostgreSQL so the transaction stays usable.
      for (const [grind, device] of [["'GROUND'", "'MOKA_POT'"], ["'GROUND'", 'NULL'], ["'WHOLE_BEAN'", 'NULL'], ['NULL', 'NULL']]) {
        await tx.$executeRawUnsafe(`DO $$ BEGIN
          BEGIN
            INSERT INTO "CartItem" ("id", "cartId", "productId", "grind", "grindDevice") VALUES ('duplicate', 'cart', 'sku', ${grind}, ${device});
            RAISE EXCEPTION 'Duplicate preparation was accepted';
          EXCEPTION WHEN unique_violation THEN NULL;
          END;
        END $$`)
      }
      await tx.$executeRawUnsafe(`DO $$ BEGIN
        BEGIN
          INSERT INTO "OrderItem" ("id", "grind", "grindDevice", "unitPrice") VALUES ('invalid', 'WHOLE_BEAN', 'MOKA_POT', 1);
          RAISE EXCEPTION 'Whole beans accepted a device';
        EXCEPTION WHEN check_violation THEN NULL;
        END;
      END $$`)
      throw rollback
    }, { timeout: 60000 }), error => error === rollback)
  } finally { await db.$disconnect() }
})
