import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
const { getDb } = await import('../lib/db')
const { paymentService } = await import('../lib/payments')
const { paymentConfig, activePaymentStates } = await import('../lib/payment-rules')
const config = paymentConfig()
if (config.environment === 'LIVE' && !process.argv.includes('--live')) throw new Error('Live reconciliation requires explicit --live; no changes made.')
const db = getDb()
try {
  const orders = await db.order.findMany({ where: { paymentEnvironment: config.environment, paymentStatus: { not: 'PAID' }, OR: [
    { payments: { some: { status: { in: [...activePaymentStates] } } } },
    { paymentExpiresAt: { lte: new Date() }, discountReservation: { status: 'ACTIVE' }, payments: { none: {} } },
  ] }, select: { id: true }, orderBy: { updatedAt: 'asc' }, take: 100 })
  const service = paymentService(db, config)
  const counts: Record<string, number> = {}
  for (const order of orders) {
    try { const outcome = await service.check(order.id); counts[outcome.status] = (counts[outcome.status] ?? 0) + 1 }
    catch { counts.ERROR = (counts.ERROR ?? 0) + 1; process.exitCode = 1 }
  }
  console.log(JSON.stringify({ environment: config.environment, checked: orders.length, results: counts }))
} finally { await db.$disconnect() }
