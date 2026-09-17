'use server'

import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { cartInputSchema } from '@/lib/validators/checkout'
import { CheckoutError, lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'
import { findVariant } from '@/lib/storefront'

export async function saveCheckoutCartAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, message: 'برای ادامهٔ خرید وارد حساب شو.' }
  const parsed = cartInputSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  try {
    await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      // One exact SKU per weight/roast/grade; never merge distinct selections.
      const products = await tx.product.findMany({ where: { slug: { in: parsed.data.map((item) => item.productId) }, isActive: true } })
      const items = parsed.data.map((item) => {
        const product = products.find((product) => product.slug === item.productId)
        const variant = findVariant(item.productId)
        if (!variant || !product || product.weightGrams !== variant.weightGrams || Number(product.price) <= 0 || product.stock < item.quantity) throw new CheckoutError('قیمت یا موجودی این انتخاب هنوز آماده نیست. سبد را بررسی کن.')
        return { productId: product.id, quantity: item.quantity }
      })
      const cart = await tx.cart.upsert({ where: { userId: user.id },
        create: { userId: user.id }, update: { checkoutKey: randomUUID() } })
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      await tx.cartItem.createMany({ data: items.map((item) => ({ ...item, cartId: cart.id })) })
    }, { maxWait: 10_000, timeout: 30_000 })
    return { success: true as const }
  } catch (error) {
    logAuthError('checkout-cart', error)
    return { success: false as const, message: error instanceof CheckoutError ? error.message : 'ذخیرهٔ سبد انجام نشد. دوباره تلاش کن.' }
  }
}
