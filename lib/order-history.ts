import 'server-only'
import { requireUser } from './current-user'
import { getDb } from './db'
import { logAuthError } from './auth-error'

export async function getMyOrders(requestedPage: unknown) {
  const user = await requireUser('/orders')
  const parsed = typeof requestedPage === 'string' && /^[1-9]\d*$/.test(requestedPage) ? Number(requestedPage) : 1
  const requested = Number.isSafeInteger(parsed) ? parsed : 1
  // Ownership always comes from the authenticated user, never a URL parameter.
  return getDb().$transaction(async (tx) => {
    const where = { userId: user.id }
    const total = await tx.order.count({ where })
    const pages = Math.max(1, Math.ceil(total / 5))
    const page = Math.min(requested, pages)
    const orders = await tx.order.findMany({
      where, take: 5, skip: (page - 1) * 5,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, number: true, createdAt: true, total: true,
        paymentStatus: true, status: true, shippingFeeFinalized: true,
        items: { select: { id: true, productName: true, weightGrams: true, quantity: true }, orderBy: { id: 'asc' } },
      },
    })
    return { orders, total, page, pages }
  }, { isolationLevel: 'RepeatableRead' }).catch((error: unknown) => {
    logAuthError('order-history', error)
    throw new Error('تاریخچهٔ سفارش‌ها دریافت نشد.')
  })
}
