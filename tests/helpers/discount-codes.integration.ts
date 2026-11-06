import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient, type Prisma } from '../../generated/prisma/client'
import { lockDiscountCode, resolveDiscountCode } from '../../lib/discount-codes'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('coupon migration, distinct-user races, per-user races and durable history on an isolated test schema', { skip: !hasTestDatabase, timeout: 180000 }, async () => {
  const urls = testDatabaseUrls() // Never fall back to DATABASE_URL.
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled, max: 5, connectionTimeoutMillis: 15000 }) })
  const schema = `coupon_test_${randomUUID().replaceAll('-', '')}`
  const migration = await readFile(new URL('../../prisma/migrations/20261106010000_discount_codes/migration.sql', import.meta.url), 'utf8')
  const inSchema = <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(async tx => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`)
    return run(tx)
  }, { maxWait: 15000, timeout: 60000 })
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
    await inSchema(async tx => {
      await tx.$executeRawUnsafe('CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "total" DECIMAL(14,0))')
      await tx.$executeRawUnsafe(`INSERT INTO "Order" VALUES ('historic', 123456)`)
      for (const statement of migration.split(';').map(sql => sql.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement)
      const [old] = await tx.$queryRaw<{ total: unknown; discountCode: null }[]>`SELECT "total", "discountCode" FROM "Order" WHERE "id" = 'historic'`
      assert.equal(Number(old.total), 123456); assert.equal(old.discountCode, null)
      await tx.$executeRaw`INSERT INTO "DiscountCode" ("id", "code", "type", "value", "maxUsers", "maxUsesPerUser", "expiresAt", "updatedAt") VALUES ('code', 'ABCD234567', 'PERCENT', 20, 1, 2, now() + interval '1 day', now())`
    })
    const consume = (userId: string, fail = false) => inSchema(async tx => {
      await lockDiscountCode(tx, 'ABCD234567')
      // Prisma normally qualifies public tables; use a small query facade to
      // exercise the real resolver against this explicitly isolated schema.
      const reader = { $queryRaw: tx.$queryRaw.bind(tx), discountCode: { findUnique: async () => (await tx.$queryRaw`SELECT * FROM "DiscountCode" WHERE "id" = 'code'` as unknown[])[0] } } as unknown as Parameters<typeof resolveDiscountCode>[0]
      const coupon = await resolveDiscountCode(reader, 'ABCD234567', userId, 1000)
      const orderId = randomUUID()
      await tx.$executeRaw`INSERT INTO "Order" ("id", "total") VALUES (${orderId}, ${1000 - coupon.amount})`
      await tx.$executeRaw`INSERT INTO "DiscountRedemption" ("id", "discountCodeId", "userId", "orderId", "amount") VALUES (${randomUUID()}, ${coupon.id}, ${userId}, ${orderId}, ${coupon.amount})`
      if (fail) throw new Error('rollback fixture')
      return { userId, orderId }
    })
    await assert.rejects(consume('rollback-user', true), /rollback/)
    const race = await Promise.allSettled([consume('alice'), consume('bob')])
    assert.equal(race.filter(r => r.status === 'fulfilled').length, 1)
    const winner = race.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ userId: string; orderId: string }>
    const repeat = await Promise.allSettled([consume(winner.value.userId), consume(winner.value.userId)])
    assert.equal(repeat.filter(r => r.status === 'fulfilled').length, 1)
    await inSchema(async tx => {
      await tx.$executeRaw`DELETE FROM "Order" WHERE "id" = ${winner.value.orderId}`
      const [usage] = await tx.$queryRaw<{ users: number; uses: number; orphaned: number }[]>`SELECT COUNT(DISTINCT "userId")::int AS users, COUNT(*)::int AS uses, COUNT(*) FILTER (WHERE "orderId" IS NULL)::int AS orphaned FROM "DiscountRedemption"`
      assert.deepEqual(usage, { users: 1, uses: 2, orphaned: 1 })
    })
    await assert.rejects(consume(winner.value.userId), /تعداد/)
  } finally {
    // The only deleted schema is this generated test prefix on the guarded test branch.
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await db.$disconnect()
  }
})
