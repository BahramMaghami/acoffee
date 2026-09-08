'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction } from '@/actions/user.actions'
import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { PasswordInput } from './password-input'

export function LoginForm({ destination }: { destination: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function submit(values: LoginInput) {
    clearErrors('root')
    startTransition(async () => {
      try {
        const result = await loginAction(values, destination)
        if (!result.success) {
          setError('root', { message: result.message })
          return
        }
        toast.success('به آ خوش برگشتی.')
        router.replace(result.redirectTo)
        router.refresh()
      } catch {
        setError('root', { message: 'ارتباط برقرار نشد. دوباره تلاش کن.' })
      }
    })
  }

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-busy={pending}
    >
      <div className="form-field">
        <label htmlFor="login-email">ایمیل</label>
        <Input
          id="login-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        {errors.email && (
          <p id="login-email-error" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="login-password">رمز عبور</label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          {...register('password')}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? 'login-password-error' : undefined
          }
        />
        {errors.password && (
          <p id="login-password-error" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>
      {errors.root && (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" />
            در حال ورود…
          </>
        ) : (
          <>
            ورود به حساب <ArrowLeft />
          </>
        )}
      </Button>
      <p className="auth-session-note">
        تا ۱۴ روز، بدون ورود دوباره به حسابت دسترسی داری.
      </p>
    </form>
  )
}
