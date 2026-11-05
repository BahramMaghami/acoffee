import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('discount migration preserves legacy prices and rejects invalid reference prices', { skip: !hasTestDatabase, timeout: 90000 }, async () => {
  const urls = testDatabaseUrls()
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled, connectionTimeoutMillis: 15000 }) })
  const schema = `discount_test_${randomUUID().replaceAll('-', '')}`
  const rollback = new Error('Rollback discount fixture')
  const migration = await readFile(new URL('../../prisma/migrations/20261106000000_product_discounts/migration.sql', import.meta.url), 'utf8')
  try {
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`)
      await tx.$executeRawUnsafe(`CREATE TABLE "Product" ("id" text PRIMARY KEY, "price" numeric(14,0), "discountPercent" int)`)
      await tx.$executeRawUnsafe(`INSERT INTO "Product" VALUES ('old', 22310000, 3), ('unknown', NULL, 0)`)
      for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(sql)
      const rows = await tx.$queryRawUnsafe<{ id: string; price: unknown; originalPrice: unknown; discountPercent: number }[]>(`SELECT * FROM "Product" ORDER BY "id"`)
      assert.equal(Number(rows[0].price), 22310000)
      assert.equal(rows[0].discountPercent, 3)
      assert.equal(rows[0].originalPrice, null)
      assert.equal(rows[1].price, null)
      await tx.$executeRawUnsafe(`INSERT INTO "Product" VALUES ('new', 800, 20, 1000)`)
      await tx.$executeRawUnsafe(`DO $$ BEGIN
        BEGIN
          INSERT INTO "Product" VALUES ('invalid', 800, 20, 700);
          RAISE EXCEPTION 'Invalid original price accepted';
        EXCEPTION WHEN check_violation THEN NULL;
        END;
      END $$`)
      throw rollback
    }, { timeout: 60000 }), error => error === rollback)
  } finally { await db.$disconnect() }
})
