'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '../(auth)/login/password-input'
import { updateProfileAction, changePasswordAction } from '@/actions/user.actions'
import { saveAddressAction } from '@/actions/address.actions'
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from '@/lib/validators/auth'
import { addressSchema, type AddressInput } from '@/lib/validators/checkout'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name } })
  return <form className="checkout-panel account-edit-form" aria-labelledby="profile-title" aria-busy={pending} noValidate onSubmit={form.handleSubmit(values => {
    setMessage(''); form.clearErrors('root')
    startTransition(async () => {
      try {
        const result = await updateProfileAction(values)
        if (!result.success) { form.setError('root', { message: result.message }); return }
        form.reset({ name: values.name.trim() }); setMessage(result.message); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد. اطلاعاتت محفوظ است؛ دوباره تلاش کن.' }) }
    })
  })}>
    <h2 id="profile-title">ویرایش مشخصات</h2>
    <fieldset disabled={pending}>
      <div className="form-field"><label htmlFor="account-name">نام</label><Input id="account-name" autoComplete="name" {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} aria-describedby="account-name-error" /><p id="account-name-error" className="field-error">{form.formState.errors.name?.message}</p></div>
      <div className="form-field"><label htmlFor="account-email">ایمیل ورود</label><Input id="account-email" type="email" dir="ltr" value={email} readOnly /><small>ایمیل ورود در این بخش قابل تغییر نیست.</small></div>
      <Button type="submit">{pending ? 'در حال ذخیره…' : 'ذخیرهٔ نام'}</Button>
    </fieldset>
    {form.formState.errors.root && <p className="form-error" role="alert">{form.formState.errors.root.message}</p>}
    {message && <p className="account-save-message" role="status">{message}</p>}
  </form>
}

const addressFields = [
  { name: 'province', label: 'استان', autoComplete: 'address-level1' },
  { name: 'city', label: 'شهر', autoComplete: 'address-level2' },
  { name: 'postalCode', label: 'کد پستی', autoComplete: 'postal-code' },
  { name: 'alternatePhone', label: 'شمارهٔ تماس جایگزین (اختیاری)', autoComplete: 'tel' },
] as const

export function AccountAddressForm({ initial, verifiedPhone = null }: { initial?: AddressInput; verifiedPhone?: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const form = useForm<AddressInput>({ resolver: zodResolver(addressSchema), defaultValues: { ...(initial ?? { province: '', city: '', addressLine: '', postalCode: '' }), phone: verifiedPhone ?? '', alternatePhone: initial?.alternatePhone ?? '' } })
  if (!verifiedPhone) return <section className="checkout-panel"><h2>آدرس ارسال</h2><p>برای ذخیرهٔ آدرس و ادامهٔ خرید، ابتدا شمارهٔ موبایلت را با پیامک تأیید کن.</p><Link className="quiet-link" href="#account-phone-title">تأیید شمارهٔ حساب</Link></section>
  return <form className="checkout-panel account-edit-form address-form" aria-labelledby="account-address-title" aria-busy={pending} noValidate onSubmit={form.handleSubmit(values => {
    setMessage(''); form.clearErrors('root')
    startTransition(async () => {
      try {
        const result = await saveAddressAction(values)
        if (!result.success) { form.setError('root', { message: result.message }); return }
        form.reset(values); setMessage('آدرس ارسال ذخیره شد.'); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد. آدرست در فرم باقی مانده؛ دوباره تلاش کن.' }) }
    })
  })}>
    <h2 id="account-address-title">آدرس ارسال</h2>
    <p className="account-form-note">این آدرس برای خریدهای بعدی استفاده می‌شود. آدرس سفارش‌های قبلی تغییر نمی‌کند.</p>
    <fieldset disabled={pending}>
      <div className="form-field"><label htmlFor="account-address-phone">شمارهٔ موبایل تأییدشده</label><Input id="account-address-phone" dir="ltr" type="tel" value={verifiedPhone} readOnly /><small>شمارهٔ اصلی حساب در آدرس قابل تغییر نیست. شمارهٔ جایگزین تأیید پیامکی نشده است.</small></div>
      <div className="address-fields">{addressFields.map(field => <div className="form-field" key={field.name}>
        <label htmlFor={`account-${field.name}`}>{field.label}</label>
        <Input id={`account-${field.name}`} {...form.register(field.name)} autoComplete={field.autoComplete} dir={['alternatePhone', 'postalCode'].includes(field.name) ? 'ltr' : undefined} inputMode={field.name === 'alternatePhone' ? 'tel' : field.name === 'postalCode' ? 'numeric' : 'text'} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`account-${field.name}-error`} />
        <p className="field-error" id={`account-${field.name}-error`}>{form.formState.errors[field.name]?.message}</p>
      </div>)}</div>
      <div className="form-field"><label htmlFor="account-addressLine">نشانی کامل</label><textarea id="account-addressLine" rows={4} autoComplete="street-address" {...form.register('addressLine')} aria-invalid={Boolean(form.formState.errors.addressLine)} aria-describedby="account-addressLine-error" /><p className="field-error" id="account-addressLine-error">{form.formState.errors.addressLine?.message}</p></div>
      <Button type="submit">{pending ? 'در حال ذخیره…' : 'ذخیرهٔ آدرس'}</Button>
    </fieldset>
    {form.formState.errors.root && <p className="form-error" role="alert">{form.formState.errors.root.message}</p>}
    {message && <p className="account-save-message" role="status">{message}</p>}
  </form>
}

export function ChangePasswordForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', password: '', confirmPassword: '' } })
  return <form className="checkout-panel account-edit-form" aria-labelledby="change-password-title" aria-busy={pending} noValidate onSubmit={form.handleSubmit(values => {
    form.clearErrors('root')
    startTransition(async () => {
      try {
        const result = await changePasswordAction(values)
        if (!result.success) { form.setError('root', { message: result.message }); return }
        form.reset(); router.replace('/login?passwordChanged=1'); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد. اگر رمز قبلی پذیرفته نشد، با رمز جدید وارد شو.' }) }
    })
  })}>
    <h2 id="change-password-title">تغییر رمز عبور</h2>
    <p className="account-form-note">پس از تغییر رمز، باید در همهٔ دستگاه‌ها دوباره وارد حساب شوی.</p>
    <fieldset disabled={pending}>
      {([{ name: 'currentPassword', label: 'رمز فعلی' }, { name: 'password', label: 'رمز جدید' }, { name: 'confirmPassword', label: 'تکرار رمز جدید' }] as const).map(field => <div className="form-field" key={field.name}>
        <label htmlFor={`account-${field.name}`}>{field.label}</label><PasswordInput id={`account-${field.name}`} label={field.label} autoComplete={field.name === 'currentPassword' ? 'current-password' : 'new-password'} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`account-${field.name}-error`} /><p id={`account-${field.name}-error`} className="field-error">{form.formState.errors[field.name]?.message}</p>
      </div>)}
      <Button type="submit">{pending ? 'در حال تغییر…' : 'ذخیرهٔ رمز جدید'}</Button>
    </fieldset>
    {form.formState.errors.root && <p className="form-error" role="alert">{form.formState.errors.root.message}</p>}
  </form>
}
