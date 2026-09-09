import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getDb } from './db'
import { safeAuthRedirect } from './auth-redirect'
import { logAuthError } from './auth-error'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user.id) return null
  // Re-read authoritative data at the protected boundary (including role).
  try {
    return await getDb().user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, addresses: true } },
      },
    })
  } catch (error) {
    logAuthError('current-user', error)
    // Some Neon transport failures are ErrorEvents, which RSC cannot serialize.
    throw new Error('اطلاعات حساب دریافت نشد. دوباره تلاش کن.')
  }
})

export async function requireUser(destination = '/account') {
  const user = await getCurrentUser()
  if (!user)
    redirect(`/login?next=${encodeURIComponent(safeAuthRedirect(destination))}`)
  return user
}
