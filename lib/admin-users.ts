import 'server-only'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { usersPage, adminUserSearchSchema } from './validators/admin-users'
import { logAuthError } from './auth-error'
import { normalizeDigits } from './digits'
import type { Prisma } from '@/generated/prisma/client'

export async function getAdminUsers(requestedPage: unknown, requestedSearch: unknown = {}) {
  const actor = await requireAdmin()
  const parsed = adminUserSearchSchema.safeParse(requestedSearch)
  if (!parsed.success) throw new Error('نوع جست‌وجو معتبر نیست یا عبارت بیشتر از ۲۰۰ کاراکتر است.')
  const search = parsed.data
  let term = search.q
  if (search.field === 'phone') {
    term = normalizeDigits(term).replace(/[\s()\-]/g, '').replace(/^(?:\+98|0098)/, '0')
  }
  // Prisma contains uses LIKE; treat %, _ and backslashes as literal characters.
  const contains = term.replace(/[\\%_]/g, '\\$&')
  const where: Prisma.UserWhereInput = search.q
    ? (term ? { [search.field]: { contains, mode: 'insensitive' } } : { id: { in: [] } })
    : {}
  const result = await getDb().$transaction(async (tx) => {
    const total = await tx.user.count({ where })
    const pages = Math.max(1, Math.ceil(total / 20))
    const page = Math.min(usersPage(requestedPage), pages)
    const users = await tx.user.findMany({
      where,
      skip: (page - 1) * 20, take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, name: true, email: true, phone: true, phoneVerifiedAt: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    })
    return { users, page, pages, total }
  }, { isolationLevel: 'RepeatableRead' }).catch((error: unknown) => {
    logAuthError('admin-users', error)
    throw new Error('فهرست کاربران دریافت نشد.')
  })
  return { ...result, actorId: actor.id, search }
}
