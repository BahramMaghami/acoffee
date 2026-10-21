import Link from 'next/link'
import { ArrowUpLeft, Banknote, Package, ReceiptText, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAdminDashboard } from '@/lib/admin-dashboard'
import { dashboardSelection, dashboardPeriods } from '@/lib/admin-metrics'
import { currentPersianMonth, persianMonths } from '@/lib/persian-month'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { SalesChart } from './sales-chart'
import { MonthFilter } from './month-filter'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string | string[]; year?: string | string[]; month?: string | string[] }> }) {
  const selection = dashboardSelection(await searchParams)
  const period = selection.type === 'days' ? selection.days : null
  const month = selection.type === 'month' ? selection : currentPersianMonth()
  const data = await getAdminDashboard(selection)
  const cards = [
    { title: 'درآمد پرداخت‌شده', value: formatPrice(data.revenue), note: 'مجموع مبلغ سفارش‌های پرداخت‌شده', Icon: Banknote, testId: 'admin-revenue' },
    { title: 'سفارش‌های پرداخت‌شده', value: formatNumber(data.orders), note: 'تعداد سفارش، مستقل از تعداد بسته', Icon: ShoppingBag, testId: 'admin-orders' },
    { title: 'بسته‌های فروخته‌شده', value: formatNumber(data.units), note: 'جمع تعداد بسته‌ها در سفارش‌های پرداخت‌شده', Icon: Package, testId: 'admin-units' },
    { title: 'میانگین مبلغ سفارش', value: formatPrice(data.averageOrder), note: 'درآمد تقسیم بر سفارش‌های پرداخت‌شده', Icon: ReceiptText, testId: 'admin-average' },
  ]
  return <div className="shell admin-page">
    <header className="admin-heading">
      <div><span className="eyebrow">مدیریت آ</span><h1>داشبورد فروش</h1><p>نمایی از درآمد و سفارش‌های فروشگاهت.</p></div>
      <div className="admin-periods">
        <Button asChild variant="outline" size="sm"><Link href="/admin/users">مدیریت کاربران</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/shop">مشاهدهٔ فروشگاه <ArrowUpLeft /></Link></Button>
      </div>
    </header>
    <div className="admin-period-bar">
      <p>{data.days[0].label} <span>تا</span> {data.days.at(-1)!.label}</p>
      <nav className="admin-periods" aria-label="بازهٔ گزارش فروش">
        {dashboardPeriods.map((days) => <Button asChild size="sm" variant={period === days ? 'default' : 'ghost'} key={days}>
          <Link href={`/admin?days=${days}`} aria-current={period === days ? 'page' : undefined} scroll={false}>{formatNumber(days)} روز اخیر</Link>
        </Button>)}
      </nav>
    </div>
    <div className="admin-month-bar">
      <MonthFilter key={`${selection.type}-${month.year}-${month.month}`} year={month.year} month={month.month} />
      {selection.type === 'month' && <p role="status">گزارش {persianMonths[selection.month - 1]} {selection.year.toLocaleString('fa-IR', { useGrouping: false })}</p>}
    </div>
    <section className="admin-stats" aria-label="خلاصهٔ فروش">
      {cards.map(({ title, value, note, Icon, testId }) => <article className="admin-stat" key={testId}>
        <div className="admin-stat-title"><h2>{title}</h2><Icon size={19} strokeWidth={1.5} aria-hidden="true" /></div>
        <strong data-testid={testId}>{value}</strong><p>{note}</p>
      </article>)}
    </section>
    <SalesChart days={data.days} hasSales={data.orders > 0} />
    <aside className="admin-report-note">
      <h2>مبنای این گزارش</h2>
      <p>فقط سفارش‌های پرداخت‌شده در آمار آمده‌اند؛ سفارش‌های پرداخت‌نشده، ناموفق و بازپرداخت‌شده محاسبه نمی‌شوند. درآمد، مبلغ نهایی سفارش پس از تخفیف و با هزینهٔ ارسال است، نه سود فروشگاه.</p>
      <p>{selection.type === 'month' ? 'گزارش شامل تمام روزهای ماه شمسی انتخاب‌شده است.' : 'بازه شامل امروز است.'} روزها به وقت تهران محاسبه می‌شوند. مبنا تاریخ پرداخت است؛ برای سفارش پرداخت‌شده‌ای که تاریخ پرداخت ندارد، تاریخ ثبت سفارش استفاده می‌شود.</p>
    </aside>
  </div>
}
