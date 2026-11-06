import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminDiscountCodes } from '@/lib/admin-discount-codes'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { formatPersianDateTime } from '@/lib/date'
import { DiscountForm } from './discount-form'
import { CodeControls } from './code-controls'
import './discounts.css'

export const metadata = { title: 'کدهای تخفیف — مدیریت' }
export default async function DiscountGeneratorPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const data = await getAdminDiscountCodes((await searchParams).page)
  const now = new Date()
  return <div className="shell admin-page">
    <header className="admin-heading"><div><span className="eyebrow">مدیریت آ</span><h1>کدهای تخفیف</h1><p>{formatNumber(data.total)} کد · هر صفحه ۲۰ کد</p></div></header>
    <DiscountForm />
    <section className="coupon-list"><h2>کدهای ساخته‌شده</h2><p>کاربران قبلی تا سقف دفعات خود می‌توانند دوباره استفاده کنند؛ تکمیل ظرفیت کاربران فقط مانع ورود کاربر جدید می‌شود.</p>
      <div className="coupon-table"><table><caption className="sr-only">فهرست کدهای تخفیف</caption><thead><tr>{['کد', 'تخفیف', 'کاربران', 'دفعات هر کاربر', 'کل استفاده‌ها', 'پایان اعتبار', 'وضعیت', 'عملیات'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
        {data.codes.map(code => <tr key={code.id}><th scope="row"><bdi>{code.code}</bdi></th><td>{code.type === 'PERCENT' ? formatNumber(code.value) + '٪' : formatPrice(code.value)}</td>
          <td>{formatNumber(code.users)} از {formatNumber(code.maxUsers)}<small>{formatNumber(Math.max(0, code.maxUsers - code.users))} ظرفیت کاربر جدید</small></td>
          <td>{formatNumber(code.maxUsesPerUser)} بار</td><td>{formatNumber(code.uses)}</td><td>{formatPersianDateTime(code.expiresAt)}</td>
          <td>{!code.isActive ? 'غیرفعال' : code.expiresAt <= now ? 'منقضی' : 'فعال'}</td><td><CodeControls id={code.id} code={code.code} isActive={code.isActive} updatedAt={code.updatedAt.toISOString()} /></td></tr>)}
      </tbody></table></div>{!data.codes.length && <p>هنوز کدی ساخته نشده است.</p>}
    </section>
    <nav className="coupon-pagination" aria-label="صفحه‌بندی کدهای تخفیف">
      {data.page > 1 ? <Button asChild variant="outline"><Link href={`?page=${data.page - 1}`}>قبلی</Link></Button> : <Button disabled variant="outline">قبلی</Button>}
      <span>صفحهٔ {formatNumber(data.page)} از {formatNumber(data.pages)}</span>
      {data.page < data.pages ? <Button asChild variant="outline"><Link href={`?page=${data.page + 1}`}>بعدی</Link></Button> : <Button disabled variant="outline">بعدی</Button>}
    </nav>
  </div>
}
