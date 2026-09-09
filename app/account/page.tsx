import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, MapPin, UserRound } from 'lucide-react'
import { requireUser } from '@/lib/current-user'
import { formatPersianDate } from '@/lib/date'
import { formatNumber } from '@/lib/storefront'
import { Button } from '@/components/ui/button'
import { getDb } from '@/lib/db'
import '../checkout/checkout.css'

export const metadata: Metadata = { title: 'حساب من' }

export default async function AccountPage() {
  const user = await requireUser()
  const orders = await getDb().order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20,
    select: { id: true, number: true, total: true, paymentStatus: true, createdAt: true } }).catch(() => { throw new Error('سفارش‌های حساب دریافت نشد.') })
  const initial = Array.from(user.name.trim())[0]?.toLocaleUpperCase() || 'آ'
  return (
    <div className="shell page-space account-page">
      <div className="account-welcome">
        <span className="account-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <span className="eyebrow">حساب من در آ</span>
          <h1>سلام {user.name}، خوش آمدی.</h1>
          <p>خوشحالیم که اینجایی.</p>
        </div>
      </div>
      <div className="account-grid">
        <section className="account-profile">
          <h2>
            <UserRound size={19} />
            مشخصات حساب
          </h2>
          <dl>
            <div>
              <dt>نام</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>ایمیل</dt>
              <dd dir="ltr">{user.email}</dd>
            </div>
            <div>
              <dt>نوع حساب</dt>
              <dd>{user.role === 'ADMIN' ? 'مدیر' : 'مشتری'}</dd>
            </div>
            <div>
              <dt>تاریخ عضویت</dt>
              <dd>{formatPersianDate(user.createdAt)}</dd>
            </div>
          </dl>
        </section>
        <section className="account-activity">
          <h2>فنجان‌های پیش رو</h2>
          <div className="account-stat">
            <ShoppingBag size={20} />
            <span>سفارش‌های من</span>
            <strong>{formatNumber(user._count.orders)}</strong>
          </div>
          <div className="account-stat">
            <MapPin size={20} />
            <span>آدرس‌های ثبت‌شده</span>
            <strong>{formatNumber(user._count.addresses)}</strong>
          </div>
          <p>
            قهوهٔ بعدی‌ات را انتخاب کن. آدرس ارسال برای خریدهای بعدی در حسابت می‌ماند.
          </p>
          <Button asChild>
            <Link href="/shop">
              انتخاب قهوه <ArrowLeft />
            </Link>
          </Button>
        </section>
      </div>
      <section className="checkout-panel account-orders"><h2>سفارش‌های اخیر</h2>
        {orders.length ? orders.map((order) => <Link className="account-order-link" key={order.id} href={`/orders/${order.id}`}>
          <strong>سفارش {formatNumber(order.number)}</strong><span>{formatPersianDate(order.createdAt)}</span>
          <span>{order.paymentStatus === 'PAID' ? 'پرداخت‌شده' : 'در انتظار پرداخت'}</span><span>{formatNumber(Number(order.total))} تومان</span>
        </Link>) : <p>هنوز سفارشی ثبت نکرده‌ای.</p>}
      </section>
    </div>
  )
}
