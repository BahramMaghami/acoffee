import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('payment migration is additive and enforces one open attempt and one settlement per order', { skip: !hasTestDatabase }, async () => {
  const urls = testDatabaseUrls()
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled }) })
  const schema = `payment_${randomUUID().replaceAll('-', '')}`
  const migration = (await readFile('prisma/migrations/20261108000000_zarinpal_payments/migration.sql', 'utf8')).replace(/^BEGIN;|^COMMIT;/gm, '')
  try {
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`)
      await tx.$executeRawUnsafe('CREATE TABLE "Order" (id TEXT PRIMARY KEY, total NUMERIC(14,0))')
      await tx.$executeRawUnsafe('CREATE TABLE "Cart" (id TEXT PRIMARY KEY)')
      await tx.$executeRawUnsafe('CREATE TABLE "DiscountCode" (id TEXT PRIMARY KEY)')
      await tx.$executeRawUnsafe('CREATE TABLE "DiscountRedemption" (id TEXT PRIMARY KEY, amount NUMERIC(14,0))')
      await tx.$executeRawUnsafe(`INSERT INTO "Order" VALUES ('old',123456)`)
      await tx.$executeRawUnsafe(`INSERT INTO "DiscountRedemption" VALUES ('old-use',456)`)
      for (const statement of migration.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement)
      const historical = await tx.$queryRawUnsafe<{ total: string; paymentEnvironment: null }[]>('SELECT total::text, "paymentEnvironment" FROM "Order"')
      assert.deepEqual(historical, [{ total: '123456', paymentEnvironment: null }])
      const ledger = await tx.$queryRawUnsafe<{ amount: string; environment: null }[]>('SELECT amount::text, environment FROM "DiscountRedemption"')
      assert.deepEqual(ledger, [{ amount: '456', environment: null }])
      const insert = (id: string, state: string) => tx.$executeRawUnsafe(`INSERT INTO "PaymentAttempt" (id,"orderId",method,environment,status,"amountRial","expiresAt","updatedAt") VALUES ('${id}','old','ZARINPAL','SANDBOX','${state}',10000,NOW(),NOW())`)
      await insert('p1', 'PENDING')
      await tx.$executeRawUnsafe('SAVEPOINT uniqueness')
      await assert.rejects(insert('p2', 'REQUESTING'))
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT uniqueness')
      await tx.$executeRawUnsafe(`UPDATE "PaymentAttempt" SET status='SUCCEEDED' WHERE id='p1'`)
      await tx.$executeRawUnsafe('SAVEPOINT settlement')
      await assert.rejects(insert('p3', 'SUCCEEDED'))
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT settlement')
      throw new Error('ROLLBACK_TEST_SCHEMA')
    }, { timeout: 60000 }), /ROLLBACK_TEST_SCHEMA/)
  } finally { await db.$disconnect() }
})
