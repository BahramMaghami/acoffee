import 'server-only'
import { randomInt } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { checkDiscountEligibility, couponAmount, DiscountCodeError } from './discount-code-rules'
import { paymentConfig, type PaymentEnvironment } from './payment-rules'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function generateDiscountCode() {
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('')
}

type CodeDb = Pick<Prisma.TransactionClient, 'discountCode' | '$queryRaw'>
export async function lockDiscountCode(db: Pick<Prisma.TransactionClient, '$queryRaw'>, code: string) {
  // All consumers lock the same code before reading quotas, even across users.
  await db.$queryRaw`SELECT "id" FROM "DiscountCode" WHERE "code" = ${code} FOR UPDATE`
}
export async function resolveDiscountCode(db: CodeDb, text: string, userId: string, subtotal: number, environment: PaymentEnvironment = paymentConfig().environment) {
  const code = await db.discountCode.findUnique({ where: { code: text } })
  if (!code) throw new DiscountCodeError('کد تخفیف پیدا نشد.')
  const [usage] = await db.$queryRaw<{ users: number; userUses: number }[]>`
    SELECT COUNT(DISTINCT "userId")::int AS "users",
      COUNT(*) FILTER (WHERE "userId" = ${userId})::int AS "userUses"
    FROM (
      SELECT "userId" FROM "DiscountRedemption" WHERE "discountCodeId" = ${code.id}
        AND ("environment"::text = ${environment} OR ("environment" IS NULL AND ${environment} = 'LIVE'))
      UNION ALL
      SELECT "userId" FROM "DiscountReservation" WHERE "discountCodeId" = ${code.id}
        AND "environment"::text = ${environment} AND "status" = 'ACTIVE'
    ) AS uses
  `
  checkDiscountEligibility({ ...code, value: Number(code.value) }, usage)
  return { id: code.id, code: code.code, type: code.type, value: Number(code.value),
    amount: couponAmount(subtotal, code.type, Number(code.value)), version: code.updatedAt.toISOString() }
}

export const discountConsumptionStage = 'PAYMENT_SETTLED' as const
export async function reserveDiscount(db: Pick<Prisma.TransactionClient, 'discountReservation'>, input: {
  discountCodeId: string; userId: string; orderId: string; amount: number; environment: PaymentEnvironment; expiresAt: Date
}) {
  // Caller holds the code lock and has just checked quotas including active holds.
  return db.discountReservation.create({ data: input })
}
export async function settleDiscount(db: Prisma.TransactionClient, orderId: string) {
  const reservation = await db.discountReservation.findUnique({ where: { orderId } })
  if (!reservation) return
  await db.$queryRaw`SELECT "id" FROM "DiscountCode" WHERE "id" = ${reservation.discountCodeId} FOR UPDATE`
  if (reservation.status === 'CONSUMED') return
  if (reservation.status !== 'ACTIVE') throw new DiscountCodeError('رزرو تخفیف آزاد شده؛ پرداخت نیازمند بررسی است.')
  await db.discountRedemption.upsert({ where: { orderId }, update: {}, create: {
    orderId, discountCodeId: reservation.discountCodeId, userId: reservation.userId, amount: reservation.amount, environment: reservation.environment,
  } })
  await db.discountReservation.update({ where: { orderId }, data: { status: 'CONSUMED' } })
}
export async function releaseDiscount(db: Prisma.TransactionClient, orderId: string) {
  const reservation = await db.discountReservation.findUnique({ where: { orderId } })
  if (!reservation || reservation.status !== 'ACTIVE') return
  await db.$queryRaw`SELECT "id" FROM "DiscountCode" WHERE "id" = ${reservation.discountCodeId} FOR UPDATE`
  await db.discountReservation.update({ where: { orderId }, data: { status: 'RELEASED' } })
}
