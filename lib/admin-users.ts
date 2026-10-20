import 'server-only'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { usersPage } from './validators/admin-users'
import { logAuthError } from './auth-error'

export async function getAdminUsers(requestedPage: unknown) {
  const actor = await requireAdmin()
  const result = await getDb().$transaction(async (tx) => {
    const total = await tx.user.count()
    const pages = Math.max(1, Math.ceil(total / 20))
    const page = Math.min(usersPage(requestedPage), pages)
    const users = await tx.user.findMany({
      skip: (page - 1) * 20, take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    })
    return { users, page, pages, total }
  }, { isolationLevel: 'RepeatableRead' }).catch((error: unknown) => {
    logAuthError('admin-users', error)
    throw new Error('فهرست کاربران دریافت نشد.')
  })
  return { ...result, actorId: actor.id }
}
