import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminUsers } from '@/lib/admin-users'
import { formatPersianDate } from '@/lib/date'
import { formatNumber } from '@/lib/storefront'
import { UserControls } from './user-controls'
import './users.css'

export const metadata = { title: 'مدیریت کاربران' }

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const data = await getAdminUsers((await searchParams).page)
  return <div className="shell admin-page">
    <header className="admin-heading">
      <div><span className="eyebrow">مدیریت آ</span><h1>کاربران</h1><p>{formatNumber(data.total)} کاربر · هر صفحه ۲۰ نفر</p></div>
      <Button asChild variant="outline"><Link href="/admin">داشبورد فروش</Link></Button>
    </header>
    <div className="admin-users-table">
      <table>
        <caption className="sr-only">کاربران فروشگاه</caption>
        <thead><tr>{['نام', 'ایمیل', 'نقش', 'تاریخ عضویت', 'سفارش‌ها', 'عملیات'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{data.users.map(user => <tr key={user.id}>
          <th scope="row">{user.name}</th><td dir="ltr">{user.email}</td>
          <td>{user.role === 'ADMIN' ? 'مدیر' : 'کاربر'}</td>
          <td>{formatPersianDate(user.createdAt)}</td><td>{formatNumber(user._count.orders)}</td>
          <td><UserControls id={user.id} name={user.name} role={user.role} self={user.id === data.actorId} hasOrders={user._count.orders > 0} /></td>
        </tr>)}</tbody>
      </table>
      {!data.users.length && <p>کاربری ثبت نشده است.</p>}
    </div>
    <nav className="admin-users-pagination" aria-label="صفحه‌بندی کاربران">
      {data.page > 1 ? <Button asChild variant="outline"><Link href={`/admin/users?page=${data.page - 1}`}>قبلی</Link></Button> : <Button variant="outline" disabled>قبلی</Button>}
      <span>صفحهٔ {formatNumber(data.page)} از {formatNumber(data.pages)}</span>
      {data.page < data.pages ? <Button asChild variant="outline"><Link href={`/admin/users?page=${data.page + 1}`}>بعدی</Link></Button> : <Button variant="outline" disabled>بعدی</Button>}
    </nav>
  </div>
}
