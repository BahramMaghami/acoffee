import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminUsers } from '@/lib/admin-users'
import { formatPersianDate } from '@/lib/date'
import { formatNumber } from '@/lib/storefront'
import { UserControls } from './user-controls'
import './users.css'

export const metadata = { title: 'مدیریت کاربران' }

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; field?: string | string[]; q?: string | string[] }>
}) {
  const params = await searchParams
  const data = await getAdminUsers(params.page, { field: params.field, q: params.q })
  function pageHref(page: number) {
    const query = new URLSearchParams({ page: String(page) })
    query.set('field', data.search.field)
    if (data.search.q) query.set('q', data.search.q)
    return `/admin/users?${query}`
  }
  return (
    <div className="shell admin-page">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">مدیریت آ</span>
          <h1>کاربران</h1>
          <p>{formatNumber(data.total)} {data.search.q ? 'کاربر مطابق جست‌وجو' : 'کاربر'} · هر صفحه ۲۰ نفر</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">داشبورد فروش</Link>
        </Button>
      </header>
      <form action="/admin/users" method="get" role="search" aria-label="جست‌وجوی کاربران" className="admin-users-search" key={`${data.search.field}:${data.search.q}`}>
        <div className="admin-users-search-field">
          <label htmlFor="user-search-field">جست‌وجو بر اساس</label>
          <select id="user-search-field" name="field" defaultValue={data.search.field}>
            <option value="name">نام</option>
            <option value="phone">شماره تماس</option>
            <option value="email">ایمیل</option>
          </select>
        </div>
        <div className="admin-users-search-query">
          <label htmlFor="user-search-query">عبارت جست‌وجو</label>
          <Input id="user-search-query" name="q" type="search" dir="auto" defaultValue={data.search.q} maxLength={200} placeholder="تمام یا بخشی از مقدار را وارد کن" />
        </div>
        <Button type="submit">جست‌وجو</Button>
        {data.search.q && <Button asChild variant="outline"><Link href="/admin/users">پاک‌کردن جست‌وجو</Link></Button>}
      </form>
      <div className="admin-users-table">
        <table>
          <caption className="sr-only">کاربران فروشگاه</caption>
          <thead>
            <tr>
              {[
                'نام',
                'ایمیل',
                'شمارهٔ تماس',
                'نقش',
                'تاریخ عضویت',
                'سفارش‌ها',
                'عملیات',
              ].map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <th scope="row">{user.name}</th>
                <td dir="ltr">{user.email}</td>
                <td>
                  {user.phone ? (
                    <>
                      <a href={`tel:${user.phone}`} dir="ltr">
                        {user.phone}
                      </a>
                      <br />
                      <small>
                        {user.phoneVerifiedAt ? 'تأییدشده' : 'تأییدنشده'}
                      </small>
                    </>
                  ) : (
                    'ثبت نشده'
                  )}
                </td>
                <td>{user.role === 'ADMIN' ? 'مدیر' : 'کاربر'}</td>
                <td>{formatPersianDate(user.createdAt)}</td>
                <td>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders?userId=${encodeURIComponent(user.id)}`} aria-label={`سفارش‌های ${user.name}`}>
                      سفارش‌ها ({formatNumber(user._count.orders)})
                    </Link>
                  </Button>
                </td>
                <td>
                  <UserControls
                    id={user.id}
                    name={user.name}
                    role={user.role}
                    self={user.id === data.actorId}
                    hasOrders={user._count.orders > 0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.users.length && <p className="admin-users-empty">{data.search.q ? 'کاربری با این مشخصات پیدا نشد.' : 'کاربری ثبت نشده است.'}</p>}
      </div>
      <nav className="admin-users-pagination" aria-label="صفحه‌بندی کاربران">
        {data.page > 1 ? (
          <Button asChild variant="outline">
            <Link href={pageHref(data.page - 1)}>قبلی</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            قبلی
          </Button>
        )}
        <span>
          صفحهٔ {formatNumber(data.page)} از {formatNumber(data.pages)}
        </span>
        {data.page < data.pages ? (
          <Button asChild variant="outline">
            <Link href={pageHref(data.page + 1)}>بعدی</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            بعدی
          </Button>
        )}
      </nav>
    </div>
  )
}
