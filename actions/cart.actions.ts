'use server'

import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { cartInputSchema } from '@/lib/validators/checkout'
import { CheckoutError, lockCheckout } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'

export async function saveCheckoutCartAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, message: 'برای ادامهٔ خرید وارد حساب شو.' }
  const parsed = cartInputSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  try {
    await getDb().$transaction(async (tx) => {
      await lockCheckout(tx, user.id)
      // The current guest storefront uses slugs as its local product identifiers.
      const products = await tx.product.findMany({ where: { slug: { in: parsed.data.map((item) => item.productId) }, isActive: true } })
      const items = parsed.data.map((item) => {
        const product = products.find((product) => product.slug === item.productId)
        if (!product || product.stock < item.quantity) throw new CheckoutError('یک قهوه ناموجود است یا تعدادش از موجودی بیشتر شده. سبد را ویرایش کن.')
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
