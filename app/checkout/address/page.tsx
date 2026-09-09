import type { Metadata } from 'next'
import { requireUser } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { AddressForm } from './address-form'
import { logAuthError } from '@/lib/auth-error'

export const metadata: Metadata = { title: 'آدرس ارسال' }

export default async function AddressPage() {
  const user = await requireUser('/checkout/address')
  const address = await getDb().address.findFirst({ where: { userId: user.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] }).catch((error: unknown) => {
    logAuthError('read-address', error)
    throw new Error('اطلاعات آدرس دریافت نشد.')
  })
  const initial = address ? { province: address.province, city: address.city, addressLine: address.addressLine,
    postalCode: address.postalCode, phone: address.phone } : undefined
  return <>
    <nav className="checkout-steps" aria-label="مراحل خرید"><span aria-current="step">۱. آدرس ارسال</span><span>۲. تأیید سفارش</span><span>۳. پرداخت</span></nav>
    <div className="page-heading"><div><span className="eyebrow">قهوه‌ات را کجا بفرستیم؟</span><h1>آدرس ارسال</h1>
      <p>{address ? 'آدرس قبلی‌ات آماده است؛ بررسی‌اش کن یا تغییرش بده.' : 'این آدرس برای خریدهای بعدی در حسابت ذخیره می‌شود.'}</p></div></div>
    <AddressForm initial={initial} recipientName={user.name} />
  </>
}
