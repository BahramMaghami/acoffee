'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '../(auth)/login/password-input'
import { formatPersianDate } from '@/lib/date'
import { accountPhoneRequestSchema, accountPhoneProofSchema, type AccountPhoneInput, type AccountPhoneProof } from '@/lib/validators/account-phone'
import { requestAccountPhoneOtpAction, verifyAccountPhoneOtpAction } from '@/actions/account-phone.actions'

type Challenge = { challengeId: string; expiresAt: string; resendAt: string }
export function AccountPhoneForm({ phone, verifiedAt }: { phone: string | null; verifiedAt: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [verified, setVerified] = useState(phone && verifiedAt ? { phone, verifiedAt } : null)
  const [clock, setClock] = useState(0)
  const [error, setError] = useState('')
  const details = useForm<AccountPhoneInput>({ resolver: zodResolver(accountPhoneRequestSchema), defaultValues: { phone: phone ?? '', currentPassword: '' } })
  const proof = useForm<AccountPhoneProof>({ resolver: zodResolver(accountPhoneProofSchema), defaultValues: { challengeId: '', code: '' } })
  useEffect(() => {
    if (!challenge) return
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [challenge])
  const remaining = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - clock) / 1000)) : 0
  const expired = Boolean(challenge && clock >= Date.parse(challenge.expiresAt))
  const request = details.handleSubmit(values => {
    setError('')
    startTransition(async () => {
      try {
        const result = await requestAccountPhoneOtpAction(values)
        if (!result.success) { setError(result.message); return }
        setClock(Date.now()); setChallenge(result)
        proof.reset({ challengeId: result.challengeId, code: '' })
        details.setValue('phone', values.phone)
      } catch { setError('ارتباط برقرار نشد. اطلاعات فرم حفظ شده؛ دوباره تلاش کن.') }
    })
  })
  const confirm = proof.handleSubmit(values => {
    setError('')
    startTransition(async () => {
      try {
        const result = await verifyAccountPhoneOtpAction(values)
        if (!result.success) { setError(result.message); return }
        setVerified({ phone: result.phone, verifiedAt: result.verifiedAt })
        details.reset({ phone: result.phone, currentPassword: '' }); proof.reset(); setChallenge(null)
        router.refresh()
      } catch { setError('ارتباط برقرار نشد. کد در فرم باقی مانده؛ دوباره تلاش کن.') }
    })
  })
  return <section className="checkout-panel account-edit-form" aria-labelledby="account-phone-title">
    <h2 id="account-phone-title">شمارهٔ موبایل حساب</h2>
    {verified ? <div className="account-phone-verified" role="status">
      <strong dir="ltr">{verified.phone}</strong>
      <span>تأییدشده در {formatPersianDate(verified.verifiedAt)}</span>
    </div> : <>
      <p className="account-form-note">برای افزودن شمارهٔ ارتباط با فروشگاه، رمز فعلی و کد پیامکی را وارد کن. شمارهٔ گیرنده در آدرس ارسال جداست.</p>
      <form noValidate aria-busy={pending} onSubmit={challenge ? confirm : request}>
        <fieldset disabled={pending}>
          <div className="form-field">
            <label htmlFor="account-contact-phone">شمارهٔ موبایل حساب</label>
            <Input id="account-contact-phone" type="tel" dir="ltr" autoComplete="tel" readOnly={Boolean(challenge)} {...details.register('phone')} aria-invalid={Boolean(details.formState.errors.phone)} aria-describedby="account-contact-phone-error" />
            <p id="account-contact-phone-error" className="field-error">{details.formState.errors.phone?.message}</p>
          </div>
          <div className="form-field">
            <label htmlFor="phone-current-password">رمز فعلی حساب</label>
            <PasswordInput id="phone-current-password" label="رمز فعلی حساب" autoComplete="current-password" readOnly={Boolean(challenge)} {...details.register('currentPassword')} aria-invalid={Boolean(details.formState.errors.currentPassword)} aria-describedby="phone-password-error" />
            <p id="phone-password-error" className="field-error">{details.formState.errors.currentPassword?.message}</p>
          </div>
          {challenge && <>
            <p className="account-form-note" role="status">{expired ? 'اعتبار کد تمام شده است؛ کد تازه درخواست کن.' : 'کد به شمارهٔ بالا ارسال شد؛ اعتبار کد دو دقیقه است.'}</p>
            <div className="form-field">
              <label htmlFor="account-phone-code">کد تأیید پیامکی</label>
              <Input id="account-phone-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...proof.register('code')} aria-invalid={Boolean(proof.formState.errors.code)} aria-describedby="account-phone-code-error" />
              <p id="account-phone-code-error" className="field-error">{proof.formState.errors.code?.message}</p>
            </div>
          </>}
          <div className="account-phone-buttons">
            <Button type="submit" disabled={expired}>{pending ? 'در حال بررسی…' : challenge ? 'تأیید و ثبت شماره' : 'دریافت کد تأیید'}</Button>
            {challenge && <>
              <Button type="button" variant="outline" disabled={remaining > 0} onClick={() => void request()}>{remaining > 0 ? `ارسال مجدد (${remaining.toLocaleString('fa-IR')})` : 'ارسال مجدد کد'}</Button>
              <Button type="button" variant="outline" onClick={() => { setChallenge(null); proof.reset(); setError('') }}>ویرایش شماره</Button>
            </>}
          </div>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </>}
  </section>
}
