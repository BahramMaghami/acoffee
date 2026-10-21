import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminOrders } from '@/lib/admin-orders'
import { formatPersianDateTime } from '@/lib/date'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { AdminOrderState } from './order-state'
import { OrderControls } from './order-controls'
import './orders.css'

export const metadata = { title: 'مدیریت سفارش‌ها' }
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const data = await getAdminOrders((await searchParams).page)
  return <div className="shell admin-page">
    <header className="admin-heading"><div><span className="eyebrow">مدیریت آ</span><h1>سفارش‌ها</h1><p>{formatNumber(data.total)} سفارش · جدیدترین‌ها · هر صفحه ۲۰ سفارش</p></div></header>
    {data.orders.length ? <div className="admin-orders-list">{data.orders.map(order => <article className="admin-order-card" key={order.id} data-testid="admin-order-card">
      <header><div><h2>سفارش {formatNumber(order.number)} · {order.user.name}</h2><p>گیرنده: {order.recipientName}</p></div><time dateTime={order.createdAt.toISOString()}>{formatPersianDateTime(order.createdAt)}</time></header>
      <AdminOrderState payment={order.paymentStatus} status={order.status} paidAt={order.paidAt} deliveredAt={order.deliveredAt} />
      <ul className="admin-order-items">{order.items.map(item => <li key={item.id}><span>{item.productName}</span><span>{formatNumber(item.quantity)} بسته · {formatNumber(item.weightGrams)} گرم</span></li>)}</ul>
      <footer><strong>{formatPrice(Number(order.total))}</strong><div className="admin-order-controls">
        <Button asChild variant="outline" size="sm"><Link href={`/admin/orders/${order.id}`} aria-label={`جزئیات سفارش ${formatNumber(order.number)}`}>جزئیات سفارش</Link></Button>
        <OrderControls id={order.id} number={formatNumber(order.number)} updatedAt={order.updatedAt.toISOString()} paid={order.paymentStatus === 'PAID'} delivered={order.status === 'DELIVERED'} />
      </div></footer>
    </article>)}</div> : <p className="admin-orders-empty">هنوز سفارشی ثبت نشده است.</p>}
    {data.pages > 1 && <nav className="admin-orders-pagination" aria-label="صفحه‌بندی سفارش‌های مدیریت">
      {data.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={`/admin/orders?page=${data.page - 1}`}>قبلی</Link></Button> : <Button variant="outline" size="sm" disabled>قبلی</Button>}
      <span>صفحهٔ {formatNumber(data.page)} از {formatNumber(data.pages)}</span>
      {data.page < data.pages ? <Button asChild variant="outline" size="sm"><Link href={`/admin/orders?page=${data.page + 1}`}>بعدی</Link></Button> : <Button variant="outline" size="sm" disabled>بعدی</Button>}
    </nav>}
  </div>
}
