import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())
const { getDb } = await import('../lib/db')
const db = getDb()
try {
  const verification = await db.$queryRaw<{ migration_applied: boolean; columns: number }[]>`
    SELECT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261106020000_alternate_contact_phone' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migration_applied,
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('Address', 'Order') AND column_name = 'alternatePhone') AS columns
  `
  await db.address.findFirst({ select: { alternatePhone: true } })
  await db.order.findFirst({ select: { alternatePhone: true } })
  console.log(JSON.stringify({ verification, prismaReads: 'ok' }))
  if (!verification.every(row => row.migration_applied && row.columns === 2)) process.exitCode = 1
} catch (error) {
  console.error('Read-only address contact verification failed.', error instanceof Error ? error.name : 'Unknown error')
  process.exitCode = 1
} finally { await db.$disconnect() }
