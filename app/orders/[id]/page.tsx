import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, CreditCard } from 'lucide-react'
import { requireUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { formatPersianDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import '../../checkout/checkout.css'

export const metadata: Metadata = { title: 'جزئیات سفارش' }

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser(`/orders/${id}`)
  const order = await getDb().order.findFirst({ where: { id, userId: user.id }, include: { items: true } })
  if (!order) notFound()
  return <div className="shell page-space checkout-page">
    <div className="page-heading"><div><span className="eyebrow"><Check size={17} /> سفارش ثبت شد</span><h1>سفارش شمارهٔ {formatNumber(order.number)}</h1><p>{formatPersianDate(order.createdAt)} · {order.paymentStatus === 'PAID' ? 'پرداخت‌شده' : 'در انتظار پرداخت'}</p></div></div>
    <div className="checkout-grid"><div><section className="checkout-panel"><h2>قهوه‌های سفارش</h2>
      {order.items.map((item) => <div className="checkout-line" key={item.id}><div><strong>{item.productName}</strong><p>{formatNumber(item.quantity)} بسته · {formatNumber(item.weightGrams)} گرم</p></div><span>{formatPrice(Number(item.lineTotal))}</span></div>)}
    </section><section className="checkout-panel checkout-address"><h2>نشانی گیرنده</h2><strong>{order.recipientName}</strong><p>{order.province}، {order.city}، {order.addressLine}</p><p>کد پستی: <bdi>{order.postalCode}</bdi></p><p>شماره تماس: <bdi>{order.phone}</bdi></p></section></div>
    <aside className="order-summary"><span className="eyebrow">پرداخت سفارش</span><h2>{order.paymentStatus === 'PAID' ? 'پرداخت انجام شده است' : 'سفارشت در حسابت محفوظ است'}</h2><dl>
      <div><dt>جمع کالاها</dt><dd>{formatPrice(Number(order.subtotal))}</dd></div><div><dt>هزینهٔ ارسال</dt><dd>{order.shippingFeeFinalized ? formatPrice(Number(order.shippingFee)) : 'هنوز تعیین نشده'}</dd></div><div className="summary-total"><dt>{order.shippingFeeFinalized ? 'مبلغ سفارش' : 'جمع فعلی سفارش'}</dt><dd>{formatPrice(Number(order.total))}</dd></div>
    </dl>{order.paymentStatus !== 'PAID' && <><Button className="w-full" size="lg" disabled><CreditCard />پرداخت آنلاین به‌زودی</Button><p>درگاه پرداخت هنوز فعال نیست و مبلغی دریافت نشده است. هزینهٔ ارسال پیش از پرداخت مشخص خواهد شد.</p></>}
      <Link href="/account" className="quiet-link">مشاهدهٔ حساب و سفارش‌ها</Link>
    </aside></div>
  </div>
}
