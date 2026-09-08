'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { placeOrderSchema } from '@/lib/validators/checkout'
import { checkoutQuote, CheckoutError, lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'

export async function placeOrderAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, message: 'برای ثبت سفارش وارد حساب شو.' }
  const parsed = placeOrderSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: 'اطلاعات سفارش معتبر نیست. صفحه را تازه کن.' }
  try {
    const order = await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      const existing = await tx.order.findUnique({ where: { checkoutKey: parsed.data.checkoutKey }, select: { id: true, userId: true } })
      if (existing?.userId === user.id) return existing
      if (existing) throw new CheckoutError('اطلاعات سفارش معتبر نیست.')
      const quote = await checkoutQuote(user.id, tx)
      if (quote.checkoutKey !== parsed.data.checkoutKey || quote.quoteHash !== parsed.data.quoteHash)
        throw new CheckoutError('سبد، آدرس یا قیمت تغییر کرده است. صفحه را تازه کن و دوباره تأیید کن.')
      // Pending/unpaid orders do not reserve stock. Payment integration must
      // revalidate and reserve inventory atomically before opening the gateway.
      return tx.order.create({ data: { userId: user.id, checkoutKey: quote.checkoutKey,
        ...quote.shipping, subtotal: quote.subtotal, shippingFee: quote.shippingFee, total: quote.total,
        items: { create: quote.items } }, select: { id: true } })
    }, { timeout: 15_000 })
    revalidatePath('/account')
    return { success: true as const, orderId: order.id }
  } catch (error) {
    logAuthError('place-order', error)
    return { success: false as const, message: error instanceof CheckoutError ? error.message : 'ثبت سفارش انجام نشد. دوباره تلاش کن؛ درخواست تکراری سفارش تازه نمی‌سازد.' }
  }
}
