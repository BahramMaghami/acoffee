import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/current-user'
import { checkoutQuote, CheckoutError, lastShippingMethod } from '@/lib/checkout'
import { cartLineKey, preparationLabel } from '@/lib/order-options'
import { getDb } from '@/lib/db'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { CheckoutSummary } from './checkout-summary'

export const metadata: Metadata = { title: 'تأیید سفارش' }

export default async function PlaceOrderPage() {
  const user = await requireUser('/checkout/place-order')
  const cart = await getDb()
    .cart.findUnique({
      where: { userId: user.id },
      select: { checkoutKey: true },
    })
    .catch(() => {
      throw new Error('سبد خرید دریافت نشد.')
    })
  if (cart) {
    const existing = await getDb()
      .order.findUnique({
        where: { checkoutKey: cart.checkoutKey },
        select: { id: true, userId: true },
      })
      .catch(() => {
        throw new Error('وضعیت سفارش دریافت نشد.')
      })
    if (existing?.userId === user.id) redirect(`/orders/${existing.id}`)
  }
  let quote
  try {
    quote = await checkoutQuote(user.id)
  } catch (error) {
    if (!(error instanceof CheckoutError))
      throw new Error('اطلاعات سفارش دریافت نشد.')
    return (
      <div className="empty-state">
        <h1>سفارش آمادهٔ تأیید نیست.</h1>
        <p>{error.message}</p>
        <Link href="/checkout/address" className="quiet-link">
          بررسی آدرس و سبد خرید
        </Link>
      </div>
    )
  }
  const initialShippingMethod = await lastShippingMethod(user.id)
  return (
    <>
      <nav className="checkout-steps" aria-label="مراحل خرید">
        <Link href="/checkout/address">۱. آدرس ارسال</Link>
        <span aria-current="step">۲. تأیید سفارش</span>
        <span>۳. پرداخت</span>
      </nav>
      <div className="page-heading">
        <div>
          <span className="eyebrow">یک نگاه آخر</span>
          <h1>تأیید سفارش</h1>
          <p>قهوه‌ها، نشانی و مبلغ را بررسی کن.</p>
        </div>
      </div>
      <div className="checkout-grid">
        <div>
          <section className="checkout-panel">
            <h2>قهوه‌های انتخابی</h2>
            {quote.items.map((item) => (
              <div className="checkout-line" key={cartLineKey(item.productId, item.grind, item.grindDevice)}>
                <div>
                  <strong>{item.productName}</strong>
                  <p>
                    {formatNumber(item.quantity)} بسته ·{' '}
                    {formatNumber(item.weightGrams)} گرم
                    {' · '}{preparationLabel(item.grind, item.grindDevice)}
                  </p>
                </div>
                <span>{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
            <Link className="quiet-link" href="/cart">
              ویرایش سبد
            </Link>
          </section>
          <section className="checkout-panel checkout-address">
            <div className="checkout-section-heading">
              <h2>آدرس ارسال</h2>
              <Link className="quiet-link" href="/checkout/address">
                ویرایش آدرس
              </Link>
            </div>
            <strong>{quote.shipping.recipientName}</strong>
            <p>
              {quote.shipping.province}، {quote.shipping.city}،{' '}
              {quote.shipping.addressLine}
            </p>
            <p>
              کد پستی: <bdi>{quote.shipping.postalCode}</bdi>
            </p>
            <p>
              شماره تماس: <bdi>{quote.shipping.phone}</bdi>
            </p>
            {quote.shipping.alternatePhone && <p>شمارهٔ تماس جایگزین: <bdi>{quote.shipping.alternatePhone}</bdi></p>}
          </section>
        </div>
        <CheckoutSummary key={quote.quoteHash} quote={{ checkoutKey: quote.checkoutKey, quoteHash: quote.quoteHash, subtotal: quote.subtotal, shippingFee: quote.shippingFee, total: quote.total }} initialShippingMethod={initialShippingMethod} />
      </div>
    </>
  )
}
