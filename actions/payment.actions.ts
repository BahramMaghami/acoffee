'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { lockPaymentOrder, paymentService } from '@/lib/payments'
import {
  PaymentError,
  isActivePayment,
  paymentConfig,
} from '@/lib/payment-rules'
import { releaseDiscount } from '@/lib/discount-codes'
import { lockCheckout } from '@/lib/checkout'
import {
  orderPaymentSchema,
  manualPaymentSchema,
  voidManualPaymentSchema,
} from '@/lib/validators/payment'

function refreshPayment(orderId: string) {
  for (const path of [
    '/admin',
    '/admin/orders',
    `/admin/orders/${orderId}`,
    '/orders',
    `/orders/${orderId}`,
    '/admin/discount-generator',
  ])
    revalidatePath(path)
}
function failure(error: unknown) {
  // Gateway bodies, credentials and financial references are never logged.
  return {
    success: false as const,
    message:
      error instanceof PaymentError
        ? error.message
        : 'بررسی پرداخت انجام نشد؛ سفارش محفوظ است. دوباره وضعیت را بررسی کن.',
  }
}
export async function startPaymentAction(input: unknown) {
  const actor = await getCurrentUser()
  if (!actor)
    return { success: false as const, message: 'برای پرداخت وارد حساب شو.' }
  const parsed = orderPaymentSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: 'سفارش معتبر نیست.' }
  try {
    const result = await paymentService().begin(parsed.data.orderId, actor)
    refreshPayment(result.orderId)
    return { success: true as const, ...result }
  } catch (error) {
    return failure(error)
  }
}
export async function checkPaymentAction(input: unknown) {
  const actor = await getCurrentUser()
  if (!actor)
    return {
      success: false as const,
      message: 'برای مشاهدهٔ پرداخت وارد حساب شو.',
    }
  const parsed = orderPaymentSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: 'سفارش معتبر نیست.' }
  try {
    const result = await paymentService().check(parsed.data.orderId, actor)
    refreshPayment(result.orderId)
    return { success: true as const, ...result }
  } catch (error) {
    return failure(error)
  }
}
export async function recordManualPaymentAction(input: unknown) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN')
    return { success: false as const, message: 'دسترسی مدیریت لازم است.' }
  const parsed = manualPaymentSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: parsed.error.issues[0].message }
  try {
    const result = await paymentService().manual(
      parsed.data.orderId,
      actor,
      parsed.data,
    )
    refreshPayment(result.orderId)
    return { success: true as const, ...result }
  } catch (error) {
    return failure(error)
  }
}
export async function voidManualPaymentAction(input: unknown) {
  const actor = await getCurrentUser()
  if (!actor || actor.role !== 'ADMIN')
    return { success: false as const, message: 'دسترسی مدیریت لازم است.' }
  const parsed = voidManualPaymentSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: parsed.error.issues[0].message }
  try {
    const result = await paymentService().voidManual(
      parsed.data.orderId,
      actor,
      parsed.data,
    )
    refreshPayment(result.orderId)
    return { success: true as const, ...result }
  } catch (error) {
    return failure(error)
  }
}
export async function prepareOrderRepriceAction(input: unknown) {
  const actor = await getCurrentUser()
  if (!actor) return { success: false as const, message: 'وارد حساب شو.' }
  const parsed = orderPaymentSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: 'سفارش معتبر نیست.' }
  try {
    const config = paymentConfig()
    const items = await getDb().$transaction(
      async (tx) => {
        await lockCheckout(tx, actor.id)
        await lockPaymentOrder(tx, parsed.data.orderId)
        const current = await tx.user.findUnique({
          where: { id: actor.id },
          select: { sessionVersion: true },
        })
        if (!current || current.sessionVersion !== actor.sessionVersion)
          throw new PaymentError('دوباره وارد حساب شو.')
        const order = await tx.order.findFirst({
          where: { id: parsed.data.orderId, userId: actor.id },
          include: {
            items: { include: { product: { select: { slug: true } } } },
            payments: true,
          },
        })
        if (
          !order ||
          ['PAID', 'REFUNDED'].includes(order.paymentStatus) ||
          order.status === 'CANCELLED'
        )
          throw new PaymentError('این سفارش قابل پرداخت مجدد نیست.')
        if (
          order.paymentEnvironment &&
          order.paymentEnvironment !== config.environment
        )
          throw new PaymentError(
            'سفارش آزمایشی و واقعی قابل تبدیل به یکدیگر نیستند.',
          )
        if (order.payments.some((p) => isActivePayment(p.status)))
          throw new PaymentError(
            'ابتدا وضعیت پرداخت قبلی را بررسی کن؛ هنوز امکان ساخت پرداخت جدید نیست.',
          )
        const replacement = await tx.order.findFirst({
          where: {
            repricedFromId: order.id,
            OR: [
              { paymentStatus: 'PAID' },
              {
                payments: {
                  some: {
                    status: {
                      in: ['REQUESTING', 'PENDING', 'VERIFYING', 'UNKNOWN'],
                    },
                  },
                },
              },
              {
                paymentStatus: 'UNPAID',
                paymentExpiresAt: { gt: new Date() },
                supersededAt: null,
                payments: { none: {} },
              },
            ],
          },
        })
        if (replacement)
          throw new PaymentError(
            'این سفارش قبلاً برای پرداخت مجدد ثبت شده؛ سفارش جدید را در تاریخچه باز کن.',
          )
        await releaseDiscount(tx, order.id)
        await tx.order.update({
          where: { id: order.id },
          data: { supersededAt: new Date() },
        })
        await tx.cart.upsert({
          where: { userId: actor.id },
          create: { userId: actor.id, repriceSourceId: order.id },
          update: { repriceSourceId: order.id, checkoutKey: randomUUID() },
        })
        return order.items.map((item) => ({
          productId: item.product?.slug ?? item.productSlug,
          quantity: item.quantity,
          grind: item.grind,
          grindDevice: item.grindDevice,
        }))
      },
      { isolationLevel: 'ReadCommitted', timeout: 15000 },
    )
    refreshPayment(parsed.data.orderId)
    return { success: true as const, items }
  } catch (error) {
    return failure(error)
  }
}
