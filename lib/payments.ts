import 'server-only'
import { randomUUID } from 'node:crypto'
import type { Prisma, Order, PaymentAttempt } from '@/generated/prisma/client'
import { getDb } from './db'
import { releaseDiscount, settleDiscount } from './discount-codes'
import {
  paymentConfig,
  paymentLeaseMs,
  tomanToRial,
  requireGatewayMinimum,
  PaymentError,
  isActivePayment,
  type PaymentConfig,
} from './payment-rules'
import { GatewayError, zarinpalGateway, type PaymentGateway } from './zarinpal'

type Actor = {
  id: string
  sessionVersion: number
  role?: string
  name?: string
}
export type PaymentResult = {
  orderId: string
  status: string
  message: string
  redirectUrl?: string
}
const pendingMessage =
  'نتیجهٔ پرداخت در حال بررسی است؛ دوباره پرداخت نکن و وضعیت را بررسی کن.'
const result = (
  orderId: string,
  status: string,
  message: string,
  redirectUrl?: string,
): PaymentResult => ({
  orderId,
  status,
  message,
  ...(redirectUrl ? { redirectUrl } : {}),
})

export async function lockPaymentOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`
}
async function checkActor(
  tx: Prisma.TransactionClient,
  actor: Actor,
  order: Order,
  adminOnly = false,
) {
  const current = await tx.user.findUnique({
    where: { id: actor.id },
    select: { role: true, sessionVersion: true, name: true },
  })
  if (
    !current ||
    current.sessionVersion !== actor.sessionVersion ||
    (adminOnly
      ? current.role !== 'ADMIN'
      : order.userId !== actor.id && current.role !== 'ADMIN')
  )
    throw new PaymentError('به این پرداخت دسترسی نداری؛ دوباره وارد حساب شو.')
  return current
}

export function paymentService(
  db = getDb(),
  config: PaymentConfig = paymentConfig(),
  gateway: PaymentGateway = zarinpalGateway(config),
  now = () => new Date(),
) {
  const transaction = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
    db.$transaction(fn, { isolationLevel: 'ReadCommitted', timeout: 15000 })
  function matchingEnvironment(order: Order) {
    if (order.paymentEnvironment !== config.environment)
      throw new PaymentError(
        'این سفارش مربوط به محیط دیگری است یا باید با قیمت روز دوباره بررسی شود.',
      )
  }
  async function settled(
    tx: Prisma.TransactionClient,
    order: Order,
    attempt: PaymentAttempt,
    referenceId?: string,
  ) {
    await settleDiscount(tx, order.id)
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUCCEEDED',
        settledAt: now(),
        referenceId,
        errorCode: null,
        leaseToken: null,
        leaseUntil: null,
      },
    })
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', paidAt: now() },
    })
  }
  async function failed(
    tx: Prisma.TransactionClient,
    order: Order,
    attempt: PaymentAttempt,
    status: 'FAILED' | 'EXPIRED',
    errorCode: string,
  ) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status, errorCode, leaseToken: null, leaseUntil: null },
    })
    await releaseDiscount(tx, order.id)
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'FAILED', paymentExpiresAt: now() },
    })
  }
  async function begin(orderId: string, actor: Actor): Promise<PaymentResult> {
    const token = randomUUID()
    const preparation = await transaction(async (tx) => {
      await lockPaymentOrder(tx, orderId)
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
      await checkActor(tx, actor, order)
      matchingEnvironment(order)
      if (order.paymentStatus === 'PAID')
        return {
          response: result(
            orderId,
            'SUCCEEDED',
            'این سفارش قبلاً تسویه شده است.',
          ),
        }
      const previous = await tx.paymentAttempt.findFirst({
        where: { orderId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      if (previous) {
        if (
          isActivePayment(previous.status) &&
          previous.method === 'ZARINPAL' &&
          previous.merchantId !== config.merchantId
        )
          throw new PaymentError(
            'تنظیمات مرچنت تغییر کرده است؛ پرداخت قبلی باید با تنظیمات خودش بررسی شود.',
          )
        if (
          previous.status === 'PENDING' &&
          previous.authority &&
          previous.expiresAt > now()
        )
          return {
            response: result(
              orderId,
              'PENDING',
              'ادامهٔ پرداخت',
              gateway.redirect(previous.authority),
            ),
          }
        if (isActivePayment(previous.status))
          return { response: result(orderId, previous.status, pendingMessage) }
        throw new PaymentError(
          'برای پرداخت دوباره، قیمت روز سفارش را بررسی و تأیید کن.',
        )
      }
      if (
        !order.paymentExpiresAt ||
        order.paymentExpiresAt <= now() ||
        order.supersededAt ||
        order.status === 'CANCELLED' ||
        order.paymentStatus === 'REFUNDED'
      ) {
        await releaseDiscount(tx, orderId)
        return {
          response: result(
            orderId,
            'EXPIRED',
            'برای پرداخت، قیمت روز سفارش را بررسی و دوباره تأیید کن.',
          ),
        }
      }
      const amountRial = tomanToRial(Number(order.total))
      requireGatewayMinimum(amountRial)
      const attempt = await tx.paymentAttempt.create({
        data: {
          orderId,
          method: amountRial === 0 ? 'DISCOUNT' : 'ZARINPAL',
          environment: config.environment,
          merchantId: amountRial ? config.merchantId : null,
          amountRial,
          status: 'REQUESTING',
          expiresAt: order.paymentExpiresAt,
          leaseToken: token,
          leaseUntil: new Date(now().getTime() + paymentLeaseMs),
        },
      })
      if (!amountRial) {
        await settled(tx, order, attempt)
        return {
          response: result(
            orderId,
            'SUCCEEDED',
            'سفارش با تخفیف کامل تسویه شد؛ هزینهٔ ارسال جداگانه دریافت می‌شود.',
          ),
        }
      }
      return { order, attempt }
    })
    if (preparation.response) return preparation.response
    const { order, attempt } = preparation
    let authority: string
    try {
      authority = await gateway.request({
        amountRial: Number(attempt.amountRial),
        orderId,
        phone: order.phone,
      })
    } catch (error) {
      // No redirect is ever given before authority is durably recorded. A lost
      // request response therefore cannot have sent this customer to the bank.
      await transaction(async (tx) => {
        await lockPaymentOrder(tx, orderId)
        const current = await tx.paymentAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        })
        if (current.status === 'REQUESTING' && current.leaseToken === token) {
          await failed(
            tx,
            order,
            current,
            'FAILED',
            error instanceof GatewayError ? error.code : 'REQUEST_UNAVAILABLE',
          )
        }
      })
      return result(
        orderId,
        'FAILED',
        'اتصال به درگاه انجام نشد. سفارش محفوظ است؛ برای تلاش مجدد قیمت روز را بررسی کن.',
      )
    }
    return transaction(async (tx) => {
      await lockPaymentOrder(tx, orderId)
      const updated = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: 'REQUESTING', leaseToken: token },
        data: {
          authority,
          status: 'PENDING',
          leaseToken: null,
          leaseUntil: null,
        },
      })
      if (!updated.count) return result(orderId, 'UNKNOWN', pendingMessage)
      return result(
        orderId,
        'PENDING',
        'در حال انتقال به درگاه',
        gateway.redirect(authority),
      )
    })
  }
  async function check(
    orderId: string,
    actor?: Actor,
    knownAuthority?: string,
    callbackStatus?: 'OK',
  ): Promise<PaymentResult> {
    const token = randomUUID()
    const preparation = await transaction(async (tx) => {
      await lockPaymentOrder(tx, orderId)
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
      if (actor) await checkActor(tx, actor, order)
      matchingEnvironment(order)
      const attempt = await tx.paymentAttempt.findFirst({
        where: {
          orderId,
          ...(knownAuthority
            ? { authority: knownAuthority, environment: config.environment }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
      if (order.paymentStatus === 'PAID')
        return {
          response: result(orderId, 'SUCCEEDED', 'سفارش تسویه شده است.'),
        }
      if (!attempt) {
        if (order.paymentExpiresAt && order.paymentExpiresAt <= now())
          await releaseDiscount(tx, orderId)
        return {
          response: result(
            orderId,
            'EXPIRED',
            'برای پرداخت، قیمت روز سفارش را بررسی کن.',
          ),
        }
      }
      if (!isActivePayment(attempt.status))
        return {
          response: result(
            orderId,
            attempt.status,
            'این تلاش پایان یافته است؛ برای پرداخت قیمت روز را بررسی کن.',
          ),
        }
      if (
        attempt.environment !== config.environment ||
        attempt.merchantId !== config.merchantId
      )
        throw new PaymentError('تنظیمات درگاه با این تراکنش مطابقت ندارد.')
      // OK is only a trigger to verify a known transaction, never proof of payment.
      // Persist the verification workflow start before checking the lease so a
      // simultaneous inquiry cannot swallow the callback; later checks retry it.
      if (callbackStatus === 'OK' && knownAuthority && !attempt.verificationStartedAt) {
        attempt.verificationStartedAt = now()
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { verificationStartedAt: attempt.verificationStartedAt },
        })
      }
      if (attempt.leaseUntil && attempt.leaseUntil > now())
        return { response: result(orderId, attempt.status, pendingMessage) }
      if (!attempt.authority) {
        await failed(tx, order, attempt, 'EXPIRED', 'REQUEST_INTERRUPTED')
        return {
          response: result(
            orderId,
            'EXPIRED',
            'اتصال قبلی کامل نشد؛ قیمت روز را دوباره بررسی کن.',
          ),
        }
      }
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          leaseToken: token,
          leaseUntil: new Date(now().getTime() + paymentLeaseMs),
        },
      })
      await tx.order.update({
        where: { id: orderId },
        data: { updatedAt: now() },
      })
      return { attempt, order }
    })
    if (preparation.response) return preparation.response
    const { attempt, order } = preparation
    try {
      // Successful callbacks and retries of a started verification go directly
      // to verify. Inquiry may still report IN_BANK after the bank redirects.
      const bank = attempt.verificationStartedAt
        ? null
        : await gateway.inquiry(attempt.authority!)
      if (bank === 'IN_BANK') {
        await db.paymentAttempt.updateMany({
          where: { id: attempt.id, leaseToken: token },
          data: {
            status: attempt.verificationStartedAt ? 'UNKNOWN' : 'PENDING',
            leaseToken: null,
            leaseUntil: null,
          },
        })
        return result(orderId, 'PENDING', pendingMessage)
      }
      if (bank === 'FAILED' || bank === 'REVERSED') {
        return transaction(async (tx) => {
          await lockPaymentOrder(tx, orderId)
          const current = await tx.paymentAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
          if (current.leaseToken === token && isActivePayment(current.status))
            await failed(tx, order, current, 'FAILED', bank)
          return result(
            orderId,
            current.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
            'وضعیت تراکنش بررسی شد.',
          )
        })
      }
      const permitted = await transaction(async (tx) => {
        await lockPaymentOrder(tx, orderId)
        const current = await tx.paymentAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        })
        const latestOrder = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
        })
        if (
          current.leaseToken !== token ||
          !isActivePayment(current.status) ||
          latestOrder.supersededAt
        )
          return false
        const reservation = await tx.discountReservation.findUnique({
          where: { orderId },
        })
        if (
          latestOrder.discountCode &&
          reservation?.status !== 'ACTIVE' &&
          reservation?.status !== 'CONSUMED'
        )
          throw new PaymentError(
            'رزرو تخفیف این پرداخت نیازمند بررسی مدیر است.',
          )
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'VERIFYING',
            verificationStartedAt: current.verificationStartedAt ?? now(),
          },
        })
        return true
      })
      if (!permitted) return result(orderId, 'UNKNOWN', pendingMessage)
      const verified = await gateway.verify(
        attempt.authority!,
        Number(attempt.amountRial),
      )
      return await transaction(async (tx) => {
        await lockPaymentOrder(tx, orderId)
        const current = await tx.paymentAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        })
        const currentOrder = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
        })
        if (current.status === 'SUCCEEDED')
          return result(orderId, 'SUCCEEDED', 'پرداخت تأیید شده است.')
        if (current.leaseToken !== token)
          return result(orderId, 'UNKNOWN', pendingMessage)
        await settled(tx, currentOrder, current, verified.referenceId)
        return result(orderId, 'SUCCEEDED', 'پرداخت با موفقیت تأیید شد.')
      })
    } catch (error) {
      // Never release quota or downgrade an already-settled payment on timeout,
      // including a DB failure AFTER the bank successfully verified it.
      await db.paymentAttempt.updateMany({
        where: {
          id: attempt.id,
          leaseToken: token,
          status: { in: ['PENDING', 'VERIFYING', 'UNKNOWN'] },
        },
        data: {
          status: 'UNKNOWN',
          errorCode:
            error instanceof GatewayError
              ? error.code
              : 'RECONCILIATION_REQUIRED',
          leaseToken: null,
          leaseUntil: null,
        },
      })
      return result(orderId, 'UNKNOWN', pendingMessage)
    }
  }
  async function manual(
    orderId: string,
    actor: Actor,
    input: { expectedUpdatedAt: string; note: string; reference?: string },
  ) {
    return transaction(async (tx) => {
      await lockPaymentOrder(tx, orderId)
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
      const admin = await checkActor(tx, actor, order, true)
      matchingEnvironment(order)
      if (order.updatedAt.toISOString() !== input.expectedUpdatedAt)
        throw new PaymentError('سفارش تغییر کرده؛ صفحه را تازه کن.')
      if (
        order.paymentStatus === 'PAID' ||
        order.paymentStatus === 'REFUNDED' ||
        order.supersededAt ||
        order.status === 'CANCELLED'
      )
        throw new PaymentError('این سفارش قابل تسویهٔ دستی نیست.')
      const attempts = await tx.paymentAttempt.findMany({ where: { orderId } })
      if (attempts.some((p) => isActivePayment(p.status)))
        throw new PaymentError('ابتدا وضعیت پرداخت در جریان را بررسی کن.')
      if (
        !order.paymentExpiresAt ||
        order.paymentExpiresAt <= now() ||
        attempts.some((p) => p.method === 'ZARINPAL')
      )
        throw new PaymentError(
          'مشتری باید ابتدا قیمت روز سفارش را دوباره تأیید کند.',
        )
      const amountRial = tomanToRial(Number(order.total))
      if (!amountRial)
        throw new PaymentError(
          'سفارش صفرمبلغ از مسیر تسویه با تخفیف کامل نهایی می‌شود.',
        )
      const attempt = await tx.paymentAttempt.create({
        data: {
          orderId,
          environment: config.environment,
          method: 'MANUAL',
          status: 'PENDING',
          amountRial,
          expiresAt: order.paymentExpiresAt,
          actorId: actor.id,
          actorName: admin.name,
          note: input.note,
          referenceId: input.reference || null,
        },
      })
      await settled(tx, order, attempt, input.reference || undefined)
      return result(
        orderId,
        'SUCCEEDED',
        'پرداخت خارج از درگاه با سابقهٔ مدیر ثبت شد.',
      )
    })
  }
  async function voidManual(
    orderId: string,
    actor: Actor,
    input: { paymentId: string; expectedUpdatedAt: string; note: string },
  ) {
    return transaction(async (tx) => {
      await lockPaymentOrder(tx, orderId)
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
      const admin = await checkActor(tx, actor, order, true)
      matchingEnvironment(order)
      if (order.updatedAt.toISOString() !== input.expectedUpdatedAt)
        throw new PaymentError('سفارش تغییر کرده؛ صفحه را تازه کن.')
      const payment = await tx.paymentAttempt.findFirst({
        where: {
          id: input.paymentId,
          orderId,
          method: 'MANUAL',
          status: 'SUCCEEDED',
        },
      })
      if (!payment) throw new PaymentError('فقط ثبت دستی موفق قابل ابطال است.')
      await tx.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          status: 'VOIDED',
          voidedAt: now(),
          voidedById: actor.id,
          voidedByName: admin.name,
          voidReason: input.note,
        },
      })
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'UNPAID', paidAt: null },
      })
      return result(
        orderId,
        'VOIDED',
        'ثبت دستی ابطال شد؛ سابقه و مصرف تخفیف محفوظ‌اند.',
      )
    })
  }
  return { begin, check, manual, voidManual }
}
