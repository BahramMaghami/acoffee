'use server'

import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { addressSchema } from '@/lib/validators/checkout'
import { lockCheckout, CheckoutError } from '@/lib/checkout'
import { verifiedContactPhone, addressContactDefaults } from '@/lib/address-contact'
import { logAuthError } from '@/lib/auth-error'
import { revalidatePath } from 'next/cache'

export async function saveAddressAction(input: unknown) {
  // The primary phone is never accepted from the browser, including /account.
  const parsed = addressSchema.omit({ phone: true }).safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false as const, message: 'برای ذخیرهٔ آدرس وارد حساب شو.' }
    await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      const owner = await tx.user.findUnique({ where: { id: user.id }, select: { name: true, sessionVersion: true, phone: true, phoneVerifiedAt: true } })
      if (!owner || owner.sessionVersion !== user.sessionVersion) throw new Error('InvalidSession')
      const phone = verifiedContactPhone(owner)
      if (!phone) throw new CheckoutError('ابتدا شمارهٔ موبایل را در حساب خود با پیامک تأیید کن.')
      const existing = await tx.address.findFirst({ where: { userId: user.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
      const alternatePhone = parsed.data.alternatePhone === undefined ? addressContactDefaults(existing, phone).alternatePhone : parsed.data.alternatePhone
      const data = { ...parsed.data, phone, alternatePhone: alternatePhone || null, recipientName: owner.name }
      if (existing) await tx.address.update({ where: { id: existing.id }, data })
      else await tx.address.create({ data: { ...data, userId: user.id } })
    }, { maxWait: 10_000, timeout: 30_000 })
    revalidatePath('/account')
    revalidatePath('/checkout/address')
    revalidatePath('/checkout/place-order')
    return { success: true as const }
  } catch (error) {
    logAuthError('save-address', error)
    return { success: false as const, message: error instanceof CheckoutError ? error.message : 'ذخیرهٔ آدرس انجام نشد. دوباره تلاش کن.' }
  }
}
