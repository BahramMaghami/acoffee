'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validators/auth'
import { requestPasswordResetAction } from '@/actions/user.actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  return (
    <form
      className="auth-form"
      noValidate
      aria-busy={pending}
      onSubmit={form.handleSubmit((values) => {
        form.clearErrors('root')
        setMessage('')
        startTransition(async () => {
          try {
            const result = await requestPasswordResetAction(values)
            if (!result.success) {
              form.setError('root', { message: result.message })
              return
            }
            setMessage(result.message)
          } catch {
            form.setError('root', {
              message: 'ارتباط برقرار نشد؛ دوباره تلاش کن.',
            })
          }
        })
      })}
    >
      {!enabled && (
        <p role="status" className="auth-notice">
          بازیابی رمز فعلاً در دسترس نیست. کمی بعد دوباره تلاش کن.
        </p>
      )}
      <div className="form-field">
        <label htmlFor="recovery-email">ایمیل حساب</label>
        <Input
          id="recovery-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          autoCapitalize="none"
          {...form.register('email')}
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby="recovery-email-error"
        />
        <p id="recovery-email-error" className="field-error">
          {form.formState.errors.email?.message}
        </p>
      </div>
      {form.formState.errors.root && (
        <p role="alert" className="form-error">
          {form.formState.errors.root.message}
        </p>
      )}
      {message && (
        <p role="status" className="auth-notice">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending || !enabled} className="w-full">
        {pending ? 'در حال ثبت درخواست…' : 'درخواست لینک بازیابی'}
      </Button>
    </form>
  )
}
