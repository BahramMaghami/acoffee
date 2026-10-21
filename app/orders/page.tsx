import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMyOrders } from '@/lib/order-history'
import { formatPersianDate } from '@/lib/date'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { OrderStatuses } from './order-status'
import './orders.css'

export const metadata: Metadata = {
  title: 'سفارش‌های من',
  robots: { index: false, follow: false },
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { orders, total, page, pages } = await getMyOrders((await searchParams).page)
  return (
    <div className="shell page-space order-history-page">
      <header className="order-history-heading">
        <div>
          <span className="eyebrow">حساب من در آ</span>
          <h1>سفارش‌های من</h1>
          <p>تاریخچهٔ خریدها و وضعیت پرداخت و ارسال هر سفارش.</p>
        </div>
        <span>{formatNumber(total)} سفارش · هر صفحه ۵ سفارش</span>
      </header>
      {orders.length ? (
        <div className="order-history-list">
          {orders.map((order) => (
            <article
              className="order-history-card"
              key={order.id}
              data-testid="order-history-card"
            >
              <header>
                <h2>سفارش شمارهٔ {formatNumber(order.number)}</h2>
                <time dateTime={order.createdAt.toISOString()}>
                  {formatPersianDate(order.createdAt)}
                </time>
              </header>
              <OrderStatuses
                payment={order.paymentStatus}
                shipping={order.status}
              />
              <ul className="order-history-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.productName}</span>
                    <span>
                      {formatNumber(item.quantity)} بسته ·{' '}
                      {formatNumber(item.weightGrams)} گرم
                    </span>
                  </li>
                ))}
              </ul>
              <footer>
                <div>
                  <span>
                    {order.shippingFeeFinalized
                      ? 'مبلغ سفارش'
                      : 'جمع فعلی سفارش'}
                  </span>
                  <strong>{formatPrice(Number(order.total))}</strong>
                  {!order.shippingFeeFinalized && (
                    <small>هزینهٔ ارسال هنوز نهایی نشده است.</small>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/orders/${order.id}`}
                    aria-label={`جزئیات سفارش ${formatNumber(order.number)}`}
                  >
                    جزئیات سفارش <ArrowLeft />
                  </Link>
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <section className="order-history-empty">
          <ShoppingBag size={32} aria-hidden="true" />
          <h2>هنوز سفارشی ثبت نکرده‌ای.</h2>
          <p>بعد از ثبت اولین سفارش، وضعیتش را اینجا می‌بینی.</p>
          <Button asChild>
            <Link href="/shop">
              مشاهدهٔ قهوه‌ها <ArrowLeft />
            </Link>
          </Button>
        </section>
      )}
      {pages > 1 && <nav className="order-history-pagination" aria-label="صفحه‌بندی سفارش‌ها">
        {page > 1
          ? <Button asChild variant="outline" size="sm"><Link href={`/orders?page=${page - 1}`}>قبلی</Link></Button>
          : <Button variant="outline" size="sm" disabled>قبلی</Button>}
        <span aria-live="polite">صفحهٔ {formatNumber(page)} از {formatNumber(pages)}</span>
        {page < pages
          ? <Button asChild variant="outline" size="sm"><Link href={`/orders?page=${page + 1}`}>بعدی</Link></Button>
          : <Button variant="outline" size="sm" disabled>بعدی</Button>}
      </nav>}
    </div>
  )
}
