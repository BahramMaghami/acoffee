import 'server-only'
import { z } from 'zod'
import { notFound } from 'next/navigation'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { logAuthError } from './auth-error'
import { adminOrdersPage } from './validators/admin-orders'

export async function getAdminOrders(requested: unknown, requestedUserId?: unknown) {
  await requireAdmin()
  const filter = z.string().cuid().optional().safeParse(requestedUserId)
  if (!filter.success) notFound()
  const userId = filter.data
  const result = await getDb().$transaction(async tx => {
    const user = userId ? await tx.user.findUnique({
      where: { id: userId }, select: { id: true, name: true, email: true },
    }) : null
    if (userId && !user) return null
    const where = userId ? { userId } : {}
    const total = await tx.order.count({ where })
    const pages = Math.max(1, Math.ceil(total / 20))
    const page = Math.min(adminOrdersPage(requested), pages)
    const orders = await tx.order.findMany({
      where,
      skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, number: true, createdAt: true, updatedAt: true, total: true,
        paymentStatus: true, status: true, paidAt: true, deliveredAt: true, shippingMethod: true,
        user: { select: { name: true } }, recipientName: true,
        items: { select: { id: true, productName: true, quantity: true, weightGrams: true, grind: true, grindDevice: true }, orderBy: { id: 'asc' } },
      },
    })
    return { orders, page, pages, total, user }
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 }).catch((error: unknown) => {
    logAuthError('admin-orders', error)
    throw new Error('سفارش‌ها دریافت نشد.')
  })
  if (!result) notFound()
  return result
}

export async function getAdminOrder(id: string) {
  await requireAdmin()
  const order = await getDb().order.findUnique({
    where: { id }, include: { user: { select: { name: true, email: true } }, items: { orderBy: { id: 'asc' } } },
  }).catch((error: unknown) => {
    logAuthError('admin-order', error)
    throw new Error('جزئیات سفارش دریافت نشد.')
  })
  if (!order) notFound()
  return order
}
