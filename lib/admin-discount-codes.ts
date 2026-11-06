import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getDb } from './db'
import { requireAdmin } from './current-user'
import { usersPage } from './validators/admin-users'

export async function getAdminDiscountCodes(requested: unknown) {
  await requireAdmin()
  return getDb().$transaction(async tx => {
    const total = await tx.discountCode.count()
    const pages = Math.max(1, Math.ceil(total / 20)), page = Math.min(usersPage(requested), pages)
    const codes = await tx.discountCode.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 })
    const usage = codes.length ? await tx.$queryRaw<{ id: string; users: number; uses: number }[]>`
      SELECT "discountCodeId" AS "id", COUNT(DISTINCT "userId")::int AS "users", COUNT(*)::int AS "uses"
      FROM "DiscountRedemption" WHERE "discountCodeId" IN (${Prisma.join(codes.map(code => code.id))}) GROUP BY "discountCodeId"
    ` : []
    return { page, pages, total, codes: codes.map(code => ({ ...code, value: Number(code.value), users: usage.find(u => u.id === code.id)?.users ?? 0, uses: usage.find(u => u.id === code.id)?.uses ?? 0 })) }
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
}
