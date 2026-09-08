'use server'

import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { addressSchema } from '@/lib/validators/checkout'
import { lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'

export async function saveAddressAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, message: 'برای ذخیرهٔ آدرس وارد حساب شو.' }
  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  try {
    await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      const existing = await tx.address.findFirst({ where: { userId: user.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
      const data = { ...parsed.data, recipientName: user.name }
      if (existing) await tx.address.update({ where: { id: existing.id }, data })
      else await tx.address.create({ data: { ...data, userId: user.id } })
    }, { timeout: 15_000 })
    return { success: true as const }
  } catch (error) {
    logAuthError('save-address', error)
    return { success: false as const, message: 'ذخیرهٔ آدرس انجام نشد. دوباره تلاش کن.' }
  }
}
