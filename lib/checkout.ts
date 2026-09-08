import 'server-only'
import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { getDb } from './db'

export class CheckoutError extends Error {}

export async function checkoutQuote(userId: string, db: Pick<ReturnType<typeof getDb>, 'cart' | 'address'> = getDb()) {
  const cart = await db.cart.findUnique({ where: { userId }, include: { items: { include: { product: true }, orderBy: { productId: 'asc' } } } })
  const address = await db.address.findFirst({ where: { userId }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
  if (!cart?.items.length) throw new CheckoutError('سبد خرید خالی است. دوباره قهوه‌هایت را انتخاب کن.')
  if (!address) throw new CheckoutError('ابتدا آدرس ارسال را ذخیره کن.')
  const items = cart.items.map(({ product, quantity }) => {
    if (!product.isActive || product.stock < quantity) throw new CheckoutError(`موجودی «${product.name}» کافی نیست. سبدت را ویرایش کن.`)
    return { productId: product.id, productName: product.name, productSlug: product.slug,
      weightGrams: product.weightGrams, quantity, unitPrice: Number(product.price), lineTotal: Number(product.price) * quantity }
  })
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  // Delivery pricing and payment are a separate, upcoming feature.
  const fee = 0
  if (!Number.isSafeInteger(subtotal) || subtotal + fee > 99_999_999_999_999) throw new CheckoutError('مبلغ سفارش بیش از حد مجاز است.')
  const shipping = { recipientName: address.recipientName, province: address.province, city: address.city,
    addressLine: address.addressLine, postalCode: address.postalCode, phone: address.phone }
  const quoteHash = createHash('sha256').update(JSON.stringify({ items, shipping, fee })).digest('hex')
  return { checkoutKey: cart.checkoutKey, items, shipping, subtotal, shippingFee: fee, total: subtotal + fee, quoteHash }
}

// Both writers and order placement lock the same account row, serializing changes
// to its cart/address. Prices and stock are re-read in the order transaction.
export async function lockCheckout(db: Pick<Prisma.TransactionClient, '$queryRaw'>, userId: string) {
  await db.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`
}
