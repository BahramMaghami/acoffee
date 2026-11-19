import nextEnv from '@next/env'
import { createDatabaseAdapter, databaseTransport } from '../lib/database-adapter'
import { PrismaClient } from '../generated/prisma/client'

nextEnv.loadEnvConfig(process.cwd())
async function main() {
  if (databaseTransport(process.env.DATABASE_URL) !== 'neon') throw new Error('Expected Neon source')
  const db = new PrismaClient({ adapter: createDatabaseAdapter() })
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const active = await tx.paymentAttempt.groupBy({
        by: ['environment', 'status'],
        where: { status: { in: ['REQUESTING', 'PENDING', 'VERIFYING', 'UNKNOWN'] } },
        _count: { _all: true },
      })
      const latestOrder = await tx.order.aggregate({ _count: true, _max: { createdAt: true, updatedAt: true } })
      return { source: 'Neon', checkedAt: new Date(), activePayments: active, orders: latestOrder }
    }, { timeout: 30000 })
    console.log(JSON.stringify(result, null, 2))
  } finally { await db.$disconnect() }
}
main().catch(() => {
  console.error('Source read-only check failed; no changes made. Check connectivity and environment configuration.')
  process.exitCode = 1
})
