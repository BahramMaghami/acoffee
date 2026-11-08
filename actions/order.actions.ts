'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, requireAdmin } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { placeOrderSchema } from '@/lib/validators/checkout'
import { checkoutQuote, CheckoutError, lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'
import { adminOrderSchema } from '@/lib/validators/admin-orders'
import { orderStatusUpdate } from '@/lib/order-status-update'
import { lockDiscountCode, reserveDiscount, releaseDiscount } from '@/lib/discount-codes'
import { DiscountCodeError } from '@/lib/discount-code-rules'
import { paymentConfig, paymentLifetimeMs, tomanToRial, requireGatewayMinimum, canDeleteFinancialOrder, PaymentError } from '@/lib/payment-rules'
import { lockPaymentOrder } from '@/lib/payments'

export async function manageOrderAction(
  input: unknown,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireAdmin()
  const parsed = adminOrderSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, message: 'درخواست معتبر نیست. صفحه را تازه کن.' }
  const data = parsed.data
  try {
    const result = await getDb().$transaction(
      async (tx) => {
        await lockPaymentOrder(tx, data.orderId)
        const admin = await tx.user.findUnique({
          where: { id: actor.id },
          select: { role: true, sessionVersion: true },
        })
        if (admin?.role !== 'ADMIN' || admin.sessionVersion !== actor.sessionVersion)
          return { success: false, message: 'دسترسی مدیریت نداری.' }
        const order = await tx.order.findUnique({
          where: { id: data.orderId },
          select: {
            id: true,
            updatedAt: true,
            paymentStatus: true,
            status: true,
            paidAt: true,
            deliveredAt: true,
            payments: { select: { method: true, status: true } },
          },
        })
        if (!order)
          return {
            success: false,
            message: 'این سفارش دیگر وجود ندارد. صفحه را تازه کن.',
          }
        if (order.updatedAt.toISOString() !== data.expectedUpdatedAt)
          return {
            success: false,
            message:
              'این سفارش تغییر کرده است. صفحه را تازه کن و دوباره تصمیم بگیر.',
          }
        if (data.operation === 'delete') {
          if (!canDeleteFinancialOrder(order)) return { success: false, message: 'سفارش دارای سابقهٔ مالی یا پرداخت در جریان قابل حذف نیست.' }
          await releaseDiscount(tx, order.id)
          await tx.paymentAttempt.deleteMany({ where: { orderId: order.id } })
          await tx.orderItem.deleteMany({ where: { orderId: order.id } })
          await tx.order.delete({ where: { id: order.id } })
          return { success: true, message: 'سفارش و اقلام آن حذف شدند.' }
        }
        if (data.field === 'paid') return { success: false, message: 'برای پرداخت از بخش تسویه و ثبت پرداخت خارج از درگاه استفاده کن.' }
        await tx.order.update({
          where: { id: order.id },
          data: orderStatusUpdate(order, data.field, data.value, new Date()),
        })
        return { success: true, message: 'وضعیت سفارش ذخیره شد.' }
      },
      { isolationLevel: 'Serializable', timeout: 15000 },
    )
    if (result.success) {
      revalidatePath('/admin')
      revalidatePath('/admin/orders')
      if (data.operation !== 'delete')
        revalidatePath(`/admin/orders/${data.orderId}`)
      revalidatePath('/admin/users')
      revalidatePath('/orders')
      revalidatePath(`/orders/${data.orderId}`)
      revalidatePath('/account')
    }
    return result
  } catch (error) {
    logAuthError('manage-order', error)
    return {
      success: false,
      message: 'تغییر سفارش انجام نشد. صفحه را تازه کن و دوباره تلاش کن.',
    }
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
      message: parsed.error.issues[0].message,
    }
  try {
    const config = paymentConfig()
    const order = await getDb().$transaction(
      async (tx) => {
        await lockCheckout(tx, user.id)
        const existing = await tx.order.findUnique({
          where: { checkoutKey: parsed.data.checkoutKey },
          select: { id: true, userId: true },
        })
        if (existing?.userId === user.id) return existing
        if (existing) throw new CheckoutError('اطلاعات سفارش معتبر نیست.')
        // Consistent lock order: account, source order, coupon. Settlement also
        // locks an order before its coupon; reversing this can deadlock.
        const cart = await tx.cart.findUnique({ where: { userId: user.id }, select: { repriceSourceId: true } })
        if (cart?.repriceSourceId) await lockPaymentOrder(tx, cart.repriceSourceId)
        if (parsed.data.discountCode) await lockDiscountCode(tx, parsed.data.discountCode)
        const quote = await checkoutQuote(user.id, tx, parsed.data.discountCode)
        if (
          quote.checkoutKey !== parsed.data.checkoutKey ||
          quote.quoteHash !== parsed.data.quoteHash
        )
          throw new CheckoutError(
            'سبد، آدرس یا قیمت تغییر کرده است. صفحه را تازه کن و دوباره تأیید کن.',
          )
        requireGatewayMinimum(tomanToRial(quote.total))
        const expiresAt = new Date(Date.now() + paymentLifetimeMs)
        if (quote.repriceSourceId) {
          const source = await tx.order.findFirst({ where: { id: quote.repriceSourceId, userId: user.id }, select: { id: true, paymentStatus: true, status: true } })
          if (!source || ['PAID', 'REFUNDED'].includes(source.paymentStatus) || source.status === 'CANCELLED') throw new CheckoutError('سفارش قبلی قابل پرداخت مجدد نیست.')
        }
        const created = await tx.order.create({
          data: {
            paymentEnvironment: config.environment,
            paymentExpiresAt: expiresAt,
            repricedFromId: quote.repriceSourceId,
            userId: user.id,
            checkoutKey: quote.checkoutKey,
            ...quote.shipping,
            shippingMethod: parsed.data.shippingMethod,
            subtotal: quote.subtotal,
            shippingFee: quote.shippingFee,
            total: quote.total,
            discount: quote.discount,
            discountCode: quote.coupon?.code ?? null,
            discountCodeType: quote.coupon?.type ?? null,
            discountCodeValue: quote.coupon?.value ?? null,
            items: { create: quote.items },
          },
          select: { id: true },
        })
        if (quote.coupon) await reserveDiscount(tx, { discountCodeId: quote.coupon.id, userId: user.id, orderId: created.id, amount: quote.discount, environment: config.environment, expiresAt })
        if (quote.repriceSourceId) await tx.cart.update({ where: { userId: user.id }, data: { repriceSourceId: null } })
        return created
      },
      { isolationLevel: 'ReadCommitted', maxWait: 10_000, timeout: 30_000 },
    )
    revalidatePath('/account')
    revalidatePath('/orders')
    revalidatePath('/admin/discount-generator')
    return { success: true as const, orderId: order.id }
  } catch (error) {
    logAuthError('place-order', error)
    return {
      success: false as const,
      message:
        error instanceof CheckoutError || error instanceof DiscountCodeError || error instanceof PaymentError
          ? error.message
          : 'ثبت سفارش انجام نشد. دوباره تلاش کن؛ درخواست تکراری سفارش تازه نمی‌سازد.',
    }
  }
}
