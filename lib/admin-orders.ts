import 'server-only'
import { notFound } from 'next/navigation'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { logAuthError } from './auth-error'
import { adminOrdersPage } from './validators/admin-orders'

export async function getAdminOrders(requested: unknown) {
  await requireAdmin()
  return getDb().$transaction(async tx => {
    const total = await tx.order.count()
    const pages = Math.max(1, Math.ceil(total / 20))
    const page = Math.min(adminOrdersPage(requested), pages)
    const orders = await tx.order.findMany({
      skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, number: true, createdAt: true, updatedAt: true, total: true,
        paymentStatus: true, status: true, paidAt: true, deliveredAt: true,
        user: { select: { name: true } }, recipientName: true,
        items: { select: { id: true, productName: true, quantity: true, weightGrams: true }, orderBy: { id: 'asc' } },
      },
    })
    return { orders, page, pages, total }
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 }).catch((error: unknown) => {
    logAuthError('admin-orders', error)
    throw new Error('سفارش‌ها دریافت نشد.')
  })
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
