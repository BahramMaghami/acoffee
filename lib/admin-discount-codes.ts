import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getDb } from './db'
import { requireAdmin } from './current-user'
import { usersPage } from './validators/admin-users'
import { paymentConfig } from './payment-rules'

export async function getAdminDiscountCodes(requested: unknown) {
  await requireAdmin()
  let environment = 'LIVE'
  try { environment = paymentConfig().environment } catch { /* Historical report remains accessible. */ }
  return getDb().$transaction(async tx => {
    const total = await tx.discountCode.count()
    const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(usersPage(requested), pages)
    const codes = await tx.discountCode.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 })
    const usage = codes.length ? await tx.$queryRaw<{ id: string; users: number; uses: number; reserved: number }[]>`
      SELECT "discountCodeId" AS "id", COUNT(DISTINCT "userId")::int AS "users",
        COUNT(*) FILTER (WHERE NOT held)::int AS "uses", COUNT(*) FILTER (WHERE held)::int AS reserved
      FROM (
        SELECT "discountCodeId", "userId", false AS held FROM "DiscountRedemption"
        WHERE "environment"::text = ${environment} OR ("environment" IS NULL AND ${environment} = 'LIVE')
        UNION ALL
        SELECT "discountCodeId", "userId", true AS held FROM "DiscountReservation"
        WHERE "environment"::text = ${environment} AND "status" = 'ACTIVE'
      ) usage WHERE "discountCodeId" IN (${Prisma.join(codes.map(code => code.id))}) GROUP BY "discountCodeId"
    ` : []
    return { page, pages, total, environment, codes: codes.map(code => ({ ...code, value: Number(code.value), users: usage.find(u => u.id === code.id)?.users ?? 0, uses: usage.find(u => u.id === code.id)?.uses ?? 0, reserved: usage.find(u => u.id === code.id)?.reserved ?? 0 })) }
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
}
