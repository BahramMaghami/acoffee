import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
const { getDb } = await import('../lib/db')
const db = getDb()
try {
  const migration = await db.$queryRaw<{ applied: boolean }[]>`SELECT EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name='20261108000000_zarinpal_payments' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied`
  await db.paymentAttempt.findFirst({ select: { id: true } })
  await db.discountReservation.findFirst({ select: { id: true } })
  await db.order.findFirst({ select: { paymentEnvironment: true, paymentExpiresAt: true, repricedFromId: true } })
  console.log(JSON.stringify({ migration, prismaReads: 'ok' }))
  if (!migration[0]?.applied) process.exitCode = 1
} catch { console.error('Read-only payment schema verification failed.'); process.exitCode = 1 }
finally { await db.$disconnect() }
