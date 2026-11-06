import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())
const { getDb } = await import('../lib/db')
const db = getDb()
try {
  const verification = await db.$queryRaw<{ migration_applied: boolean; tables: number; order_columns: number }[]>`
    SELECT
      EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261106010000_discount_codes' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migration_applied,
      (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('DiscountCode', 'DiscountRedemption')) AS tables,
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Order' AND column_name IN ('discountCode', 'discountCodeType', 'discountCodeValue')) AS order_columns
  `
  await db.discountCode.findFirst({ select: { id: true, code: true, expiresAt: true, maxUsers: true, maxUsesPerUser: true } })
  await db.discountRedemption.count()
  await db.order.findFirst({ select: { discountCode: true, discountCodeType: true, discountCodeValue: true } })
  console.log(JSON.stringify({ verification, prismaReads: 'ok' }))
  if (!verification.every(row => row.migration_applied && row.tables === 2 && row.order_columns === 3)) process.exitCode = 1
} catch (error) {
  console.error('Read-only coupon verification failed.', error instanceof Error ? error.name : 'Unknown error')
  process.exitCode = 1
} finally { await db.$disconnect() }
