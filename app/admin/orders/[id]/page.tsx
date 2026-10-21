import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminOrder } from '@/lib/admin-orders'
import { formatPersianDateTime } from '@/lib/date'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { OrderControls } from '../order-controls'
import { AdminOrderState } from '../order-state'
import '../orders.css'

export const metadata = { title: 'جزئیات سفارش — مدیریت' }
export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getAdminOrder((await params).id)
  return <div className="shell admin-page">
    <header className="admin-heading"><div><span className="eyebrow">مدیریت سفارش</span><h1>سفارش شمارهٔ {formatNumber(order.number)}</h1><p>ثبت‌شده در {formatPersianDateTime(order.createdAt)}</p></div><Button asChild variant="outline" size="sm"><Link href="/admin/orders">همهٔ سفارش‌ها</Link></Button></header>
    <section className="admin-order-panel"><h2>وضعیت سفارش</h2>
      <AdminOrderState payment={order.paymentStatus} status={order.status} paidAt={order.paidAt} deliveredAt={order.deliveredAt} />
      <OrderControls detail id={order.id} number={formatNumber(order.number)} updatedAt={order.updatedAt.toISOString()} paid={order.paymentStatus === 'PAID'} delivered={order.status === 'DELIVERED'} />
    </section>
    <div className="admin-order-detail-grid">
      <section className="admin-order-panel"><h2>خریدار و نشانی گیرنده</h2><p>{order.user.name}</p><p><bdi>{order.user.email}</bdi></p><hr />
        <p>گیرنده: {order.recipientName}</p><p>{order.province}، {order.city}، {order.addressLine}</p><p>کد پستی: <bdi>{order.postalCode}</bdi></p><p>تماس: <bdi>{order.phone}</bdi></p>
      </section>
      <section className="admin-order-panel"><h2>مبلغ سفارش</h2><dl className="admin-order-totals">
        <div><dt>جمع کالاها</dt><dd>{formatPrice(Number(order.subtotal))}</dd></div>
        <div><dt>تخفیف</dt><dd>{formatPrice(Number(order.discount))}</dd></div>
        <div><dt>ارسال</dt><dd>{order.shippingFeeFinalized ? formatPrice(Number(order.shippingFee)) : 'هنوز نهایی نشده'}</dd></div>
        <div><dt>مبلغ ثبت‌شده</dt><dd>{formatPrice(Number(order.total))}</dd></div>
      </dl></section>
    </div>
    <section className="admin-order-panel"><h2>محصولات سفارش</h2><ul className="admin-order-items">{order.items.map(item => <li key={item.id}><div><strong>{item.productName}</strong><p>{formatNumber(item.quantity)} بسته · {formatNumber(item.weightGrams)} گرم · هر بسته {formatPrice(Number(item.unitPrice))}</p></div><span>{formatPrice(Number(item.lineTotal))}</span></li>)}</ul></section>
  </div>
}
