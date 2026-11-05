import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())
const { getDb } = await import('../lib/db')
const db = getDb()
try {
  const verification = await db.$queryRaw<{ migration_applied: boolean; column_exists: boolean; constraint_exists: boolean }[]>`
    SELECT
      EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261106000000_product_discounts' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migration_applied,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'originalPrice') AS column_exists,
      EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_originalPrice_check' AND conrelid = 'public."Product"'::regclass) AS constraint_exists
  `
  await db.product.findFirst({ select: { originalPrice: true, price: true, discountPercent: true } })
  console.log(JSON.stringify({ verification, prismaRead: 'ok' }))
  if (!verification.every(row => row.migration_applied && row.column_exists && row.constraint_exists)) process.exitCode = 1
} catch (error) {
  console.error('Read-only discount verification failed.', error instanceof Error ? error.name : 'Unknown error')
  process.exitCode = 1
} finally { await db.$disconnect() }
