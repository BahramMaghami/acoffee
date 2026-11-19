// Read-only readiness check. Explicit file only: never fall back to production env.
import { readFileSync } from 'node:fs'
import { parse } from 'dotenv'
import { PrismaClient } from '../generated/prisma/client'
import { createDatabaseAdapter, databaseTransport } from '../lib/database-adapter'

async function main() {
  const path = process.argv[2]
  if (!path) throw new Error('Pass the path to an isolated database env file.')
  const env = parse(readFileSync(path))
  if (databaseTransport(env.DATABASE_URL) !== 'postgres') {
    throw new Error('This check requires the destination PostgreSQL URL.')
  }
  const db = new PrismaClient({ adapter: createDatabaseAdapter(env.DATABASE_URL) })
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const version = await tx.$queryRaw<Array<{ version: string }>>`SELECT version()`
      const users = await tx.user.count()
      const products = await tx.product.count()
      const orders = await tx.order.count()
      const payments = await tx.paymentAttempt.count()
      // Exercise JSON, arrays, decimals, enums, timestamps and relational queries.
      await tx.catalogProduct.findMany({ take: 3, include: { category: true, variants: true } })
      await tx.order.findMany({ take: 3, include: { items: true, payments: true, user: { select: { id: true } } } })
      const migrations = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
      return { version: version[0].version, users, products, orders, payments, migrations: Number(migrations[0].count) }
    }, { timeout: 30_000 })
    console.log(JSON.stringify({ readOnly: true, ...result }, null, 2))
  } finally { await db.$disconnect() }
}

main().catch(error => {
  // Driver errors can contain connection details. Print only a controlled code.
  const code = error && typeof error.code === 'string' && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : 'CHECK_FAILED'
  console.error(`PostgreSQL read-only check failed (${code}). Check the env file, tunnel and database permissions.`)
  process.exitCode = 1
})
