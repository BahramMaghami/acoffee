import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/current-user'
import { checkoutQuote, CheckoutError } from '@/lib/checkout'
import { getDb } from '@/lib/db'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { PlaceOrderButton } from './place-order-button'

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
              <div className="checkout-line" key={item.productId}>
                <div>
                  <strong>{item.productName}</strong>
                  <p>
                    {formatNumber(item.quantity)} بسته ·{' '}
                    {formatNumber(item.weightGrams)} گرم
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
          </section>
        </div>
        <aside className="order-summary">
          <span className="eyebrow">خلاصهٔ سفارش</span>
          <h2>همه‌چیز آماده است</h2>
          <dl>
            <div>
              <dt>جمع کالاها</dt>
              <dd>{formatPrice(quote.subtotal)}</dd>
            </div>
            <div>
              <dt>هزینهٔ ارسال</dt>
              <dd>هنوز تعیین نشده</dd>
            </div>
            <div className="summary-total">
              <dt>جمع فعلی سفارش</dt>
              <dd>{formatPrice(quote.total)}</dd>
            </div>
          </dl>
          <PlaceOrderButton
            checkoutKey={quote.checkoutKey}
            quoteHash={quote.quoteHash}
          />
          <p>
            سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود. هزینهٔ ارسال و پرداخت
            آنلاین در مرحلهٔ بعد فعال می‌شوند.
          </p>
        </aside>
      </div>
    </>
  )
}
