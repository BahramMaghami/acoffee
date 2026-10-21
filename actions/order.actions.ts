'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, requireAdmin } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { placeOrderSchema } from '@/lib/validators/checkout'
import { checkoutQuote, CheckoutError, lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'
import { adminOrderSchema } from '@/lib/validators/admin-orders'
import { orderStatusUpdate } from '@/lib/order-status-update'

export async function manageOrderAction(input: unknown): Promise<{ success: boolean; message: string }> {
  const actor = await requireAdmin()
  const parsed = adminOrderSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'درخواست معتبر نیست. صفحه را تازه کن.' }
  const data = parsed.data
  try {
    const result = await getDb().$transaction(async tx => {
      const admin = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } })
      if (admin?.role !== 'ADMIN') return { success: false, message: 'دسترسی مدیریت نداری.' }
      const order = await tx.order.findUnique({ where: { id: data.orderId }, select: {
        id: true, updatedAt: true, paymentStatus: true, status: true, paidAt: true, deliveredAt: true,
      } })
      if (!order) return { success: false, message: 'این سفارش دیگر وجود ندارد. صفحه را تازه کن.' }
      if (order.updatedAt.toISOString() !== data.expectedUpdatedAt)
        return { success: false, message: 'این سفارش تغییر کرده است. صفحه را تازه کن و دوباره تصمیم بگیر.' }
      if (data.operation === 'delete') {
        await tx.orderItem.deleteMany({ where: { orderId: order.id } })
        await tx.order.delete({ where: { id: order.id } })
        return { success: true, message: 'سفارش و اقلام آن حذف شدند.' }
      }
      await tx.order.update({ where: { id: order.id }, data: orderStatusUpdate(order, data.field, data.value, new Date()) })
      return { success: true, message: 'وضعیت سفارش ذخیره شد.' }
    }, { isolationLevel: 'Serializable', timeout: 15000 })
    if (result.success) {
      revalidatePath('/admin')
      revalidatePath('/admin/orders')
      if (data.operation !== 'delete') revalidatePath(`/admin/orders/${data.orderId}`)
      revalidatePath('/admin/users')
      revalidatePath('/orders')
      revalidatePath(`/orders/${data.orderId}`)
      revalidatePath('/account')
    }
    return result
  } catch (error) {
    logAuthError('manage-order', error)
    return { success: false, message: 'تغییر سفارش انجام نشد. صفحه را تازه کن و دوباره تلاش کن.' }
  }
}

export async function placeOrderAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user)
    return { success: false as const, message: 'برای ثبت سفارش وارد حساب شو.' }
  const parsed = placeOrderSchema.safeParse(input)
  if (!parsed.success)
    return {
      success: false as const,
      message: 'اطلاعات سفارش معتبر نیست. صفحه را تازه کن.',
    }
  try {
    const order = await getDb().$transaction(
      async (tx) => {
        await lockCheckout(tx, user.id)
        const existing = await tx.order.findUnique({
          where: { checkoutKey: parsed.data.checkoutKey },
          select: { id: true, userId: true },
        })
        if (existing?.userId === user.id) return existing
        if (existing) throw new CheckoutError('اطلاعات سفارش معتبر نیست.')
        const quote = await checkoutQuote(user.id, tx)
        if (
          quote.checkoutKey !== parsed.data.checkoutKey ||
          quote.quoteHash !== parsed.data.quoteHash
        )
          throw new CheckoutError(
            'سبد، آدرس یا قیمت تغییر کرده است. صفحه را تازه کن و دوباره تأیید کن.',
          )
        // Orders remain pending/unpaid until payment integration is implemented.
        return tx.order.create({
          data: {
            userId: user.id,
            checkoutKey: quote.checkoutKey,
            ...quote.shipping,
            subtotal: quote.subtotal,
            shippingFee: quote.shippingFee,
            total: quote.total,
            items: { create: quote.items },
          },
          select: { id: true },
        })
      },
      { maxWait: 10_000, timeout: 30_000 },
    )
    revalidatePath('/account')
    revalidatePath('/orders')
    return { success: true as const, orderId: order.id }
  } catch (error) {
    logAuthError('place-order', error)
    return {
      success: false as const,
      message:
        error instanceof CheckoutError
          ? error.message
          : 'ثبت سفارش انجام نشد. دوباره تلاش کن؛ درخواست تکراری سفارش تازه نمی‌سازد.',
    }
  }
}
