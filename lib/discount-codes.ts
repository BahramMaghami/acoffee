import 'server-only'
import { randomInt } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { checkDiscountEligibility, couponAmount, DiscountCodeError } from './discount-code-rules'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function generateDiscountCode() {
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('')
}

type CodeDb = Pick<Prisma.TransactionClient, 'discountCode' | '$queryRaw'>
export async function lockDiscountCode(db: Pick<Prisma.TransactionClient, '$queryRaw'>, code: string) {
  // All consumers lock the same code before reading quotas, even across users.
  await db.$queryRaw`SELECT "id" FROM "DiscountCode" WHERE "code" = ${code} FOR UPDATE`
}
export async function resolveDiscountCode(db: CodeDb, text: string, userId: string, subtotal: number) {
  const code = await db.discountCode.findUnique({ where: { code: text } })
  if (!code) throw new DiscountCodeError('کد تخفیف پیدا نشد.')
  const [usage] = await db.$queryRaw<{ users: number; userUses: number }[]>`
    SELECT COUNT(DISTINCT "userId")::int AS "users",
      COUNT(*) FILTER (WHERE "userId" = ${userId})::int AS "userUses"
    FROM "DiscountRedemption" WHERE "discountCodeId" = ${code.id}
  `
  checkDiscountEligibility({ ...code, value: Number(code.value) }, usage)
  return { id: code.id, code: code.code, type: code.type, value: Number(code.value),
    amount: couponAmount(subtotal, code.type, Number(code.value)), version: code.updatedAt.toISOString() }
}

// PAYMENT INTEGRATION TODO: replace placement consumption with a reservation at
// placement and one-time consumption inside the verified-success payment transaction.
// Release expired/failed reservations without erasing the historical usage ledger.
// Never call consumption again when an admin marks an already-consumed order paid.
export const discountConsumptionStage = 'ORDER_PLACED' as const
export async function consumeDiscountAtPlacement(db: Pick<Prisma.TransactionClient, 'discountRedemption'>, input: { discountCodeId: string; userId: string; orderId: string; amount: number }) {
  // Called ONLY after lockDiscountCode + resolveDiscountCode, in the order transaction.
  return db.discountRedemption.create({ data: input })
}
