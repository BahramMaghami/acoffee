'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registerAction } from '@/actions/user.actions'
import { registerSchema, type RegisterInput } from '@/lib/validators/auth'
import { PasswordInput } from '../login/password-input'

export function RegisterForm({ destination }: { destination: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })
  function submit(values: RegisterInput) {
    clearErrors('root')
    startTransition(async () => {
      try {
        const result = await registerAction(values, destination)
        if (!result.success) { setError('root', { message: result.message }); return }
        toast.success('حسابت در آ ساخته شد.')
        router.replace(result.redirectTo)
        router.refresh()
      } catch {
        setError('root', { message: 'ارتباط برقرار نشد. دوباره تلاش کن.' })
      }
    })
  }
  return <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate aria-busy={pending}>
    <div className="form-field"><label htmlFor="register-name">نام و نام خانوادگی</label>
      <Input id="register-name" autoComplete="name" placeholder="دوست داری چه صدایت کنیم؟" {...register('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} />
      {errors.name && <p id="register-name-error" className="field-error">{errors.name.message}</p>}
    </div>
    <div className="form-field"><label htmlFor="register-email">ایمیل</label>
      <Input id="register-email" type="email" dir="ltr" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
      {errors.email && <p id="register-email-error" className="field-error">{errors.email.message}</p>}
    </div>
    <div className="form-field"><label htmlFor="register-password">رمز عبور</label>
      <PasswordInput id="register-password" autoComplete="new-password" {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby="register-password-help register-password-error" />
      <p id="register-password-help" className="field-hint">دست‌کم ۸ کاراکتر؛ یک رمز طولانی و منحصربه‌فرد انتخاب کن.</p>
      <p id="register-password-error" className="field-error">{errors.password?.message}</p>
    </div>
    <div className="form-field"><label htmlFor="register-confirm">تکرار رمز عبور</label>
      <PasswordInput id="register-confirm" label="تکرار رمز عبور" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined} />
      {errors.confirmPassword && <p id="register-confirm-error" className="field-error">{errors.confirmPassword.message}</p>}
    </div>
    {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />در حال ساخت حساب…</> : <>ساخت حساب <ArrowLeft /></>}</Button>
  </form>
}
