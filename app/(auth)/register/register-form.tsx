'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registerAction } from '@/actions/user.actions'
import { signupDetailsSchema, signupOtpProofSchema, type SignupDetailsInput } from '@/lib/validators/signup-otp'
import { requestSignupOtpAction } from '@/actions/otp.actions'
import { PasswordInput } from '../login/password-input'

export function RegisterForm({ destination }: { destination: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [challenge, setChallenge] = useState<{ challengeId: string; expiresAt: string; resendAt: string; phone: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [now, setNow] = useState(0)
  const { register, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<SignupDetailsInput>({
    resolver: zodResolver(signupDetailsSchema), defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  })
  useEffect(() => {
    if (!challenge) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [challenge])
  const resendSeconds = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000)) : 0
  const expiresSeconds = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)) : 0

  function sendCode(values: SignupDetailsInput) {
    clearErrors('root')
    startTransition(async () => {
      try {
        const result = await requestSignupOtpAction({ email: values.email, phone: values.phone })
        if (!result.success) { setError('root', { message: result.message }); return }
        setChallenge({ ...result, phone: values.phone }); setCode(''); setCodeError(''); setNow(Date.now())
        toast.success('کد تأیید ارسال شد.')
      } catch { setError('root', { message: 'ارتباط برقرار نشد. اطلاعاتت حفظ شده؛ دوباره تلاش کن.' }) }
    })
  }
  function submit(values: SignupDetailsInput) {
    if (!challenge) { sendCode(values); return }
    clearErrors('root'); setCodeError('')
    const proof = signupOtpProofSchema.safeParse({ challengeId: challenge.challengeId, code })
    if (!proof.success) { setCodeError(proof.error.issues[0].message); return }
    startTransition(async () => {
      try {
        const result = await registerAction({ ...values, ...proof.data }, destination)
        if (!result.success) { setError('root', { message: result.message }); return }
        toast.success('حسابت در آ ساخته شد.')
        router.replace(result.redirectTo)
      } catch {
        setError('root', { message: 'ارتباط برقرار نشد. دوباره تلاش کن.' })
      }
    })
  }
  return <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={pending}>
    <div className="form-field"><label htmlFor="register-name">نام و نام خانوادگی</label>
      <Input id="register-name" readOnly={pending || Boolean(challenge)} autoComplete="name" placeholder="دوست داری چه صدایت کنیم؟" {...register('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} />
      {errors.name && <p id="register-name-error" className="field-error">{errors.name.message}</p>}
    </div>
    <div className="form-field"><label htmlFor="register-email">ایمیل</label>
      <Input id="register-email" readOnly={pending || Boolean(challenge)} type="email" dir="ltr" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
      {errors.email && <p id="register-email-error" className="field-error">{errors.email.message}</p>}
    </div>
    <div className="form-field"><label htmlFor="register-phone">شمارهٔ موبایل</label>
      <Input id="register-phone" readOnly={pending || Boolean(challenge)} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="09121234567" {...register('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby="register-phone-error" />
      <p id="register-phone-error" className="field-error">{errors.phone?.message}</p>
    </div>
    <div className="form-field"><label htmlFor="register-password">رمز عبور</label>
      <PasswordInput id="register-password" readOnly={pending || Boolean(challenge)} autoComplete="new-password" {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby="register-password-help register-password-error" />
      <p id="register-password-help" className="field-hint">دست‌کم ۸ کاراکتر؛ یک رمز طولانی و منحصربه‌فرد انتخاب کن.</p>
      <p id="register-password-error" className="field-error">{errors.password?.message}</p>
    </div>
    <div className="form-field"><label htmlFor="register-confirm">تکرار رمز عبور</label>
      <PasswordInput id="register-confirm" readOnly={pending || Boolean(challenge)} label="تکرار رمز عبور" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined} />
      {errors.confirmPassword && <p id="register-confirm-error" className="field-error">{errors.confirmPassword.message}</p>}
    </div>
    {challenge && <div className="form-field">
      <label htmlFor="register-otp">کد تأیید پیامکی</label>
      <p className="field-hint">کد به <bdi>{challenge.phone}</bdi> ارسال شد. {expiresSeconds > 0 ? `اعتبار: ${expiresSeconds.toLocaleString('fa-IR')} ثانیه` : 'کد منقضی شده؛ کد تازه بگیر.'}</p>
      <Input id="register-otp" value={code} onChange={event => setCode(event.target.value)} readOnly={pending} autoComplete="one-time-code" inputMode="numeric" dir="ltr" maxLength={6} aria-invalid={Boolean(codeError)} aria-describedby="register-otp-error" />
      {codeError && <p id="register-otp-error" className="field-error" role="alert">{codeError}</p>}
      <Button type="button" variant="outline" disabled={pending || resendSeconds > 0} onClick={handleSubmit(sendCode)}>{resendSeconds > 0 ? `ارسال مجدد (${resendSeconds.toLocaleString('fa-IR')})` : 'ارسال مجدد کد'}</Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => { setChallenge(null); setCode(''); setCodeError(''); clearErrors('root') }}>ویرایش اطلاعات</Button>
    </div>}
    {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={pending || Boolean(challenge && !expiresSeconds)}>{pending ? <><LoaderCircle className="animate-spin" />در حال بررسی…</> : <>{challenge ? 'تأیید کد و ساخت حساب' : 'دریافت کد تأیید'} <ArrowLeft /></>}</Button>
  </form>
}
