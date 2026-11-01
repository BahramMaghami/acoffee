'use server'

import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { addressSchema } from '@/lib/validators/checkout'
import { lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'
import { revalidatePath } from 'next/cache'

export async function saveAddressAction(input: unknown) {
  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false as const, message: 'برای ذخیرهٔ آدرس وارد حساب شو.' }
    await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      const owner = await tx.user.findUnique({ where: { id: user.id }, select: { name: true, sessionVersion: true } })
      if (!owner || owner.sessionVersion !== user.sessionVersion) throw new Error('InvalidSession')
      const existing = await tx.address.findFirst({ where: { userId: user.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
      const data = { ...parsed.data, recipientName: owner.name }
      if (existing) await tx.address.update({ where: { id: existing.id }, data })
      else await tx.address.create({ data: { ...data, userId: user.id } })
    }, { maxWait: 10_000, timeout: 30_000 })
    revalidatePath('/account')
    revalidatePath('/checkout/address')
    revalidatePath('/checkout/place-order')
    return { success: true as const }
  } catch (error) {
    logAuthError('save-address', error)
    return { success: false as const, message: 'ذخیرهٔ آدرس انجام نشد. دوباره تلاش کن.' }
  }
}
