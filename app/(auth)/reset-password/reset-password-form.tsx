'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validators/auth'
import { resetPasswordAction } from '@/actions/user.actions'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '../login/password-input'

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: '', confirmPassword: '' } })
  return <form className="auth-form" noValidate aria-busy={pending} onSubmit={form.handleSubmit(values => {
    form.clearErrors('root')
    startTransition(async () => {
      try {
        const result = await resetPasswordAction(values)
        if (!result.success) { form.setError('root', { message: result.message }); return }
        form.reset(); router.replace('/login?passwordChanged=1'); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد. اگر لینک مصرف شده بود، با رمز جدید وارد شو.' }) }
    })
  })}>
    <fieldset disabled={pending}>{([{ name: 'password', label: 'رمز جدید' }, { name: 'confirmPassword', label: 'تکرار رمز جدید' }] as const).map(field => <div className="form-field" key={field.name}>
      <label htmlFor={`reset-${field.name}`}>{field.label}</label><PasswordInput id={`reset-${field.name}`} label={field.label} autoComplete="new-password" {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`reset-${field.name}-error`} /><p id={`reset-${field.name}-error`} className="field-error">{form.formState.errors[field.name]?.message}</p>
    </div>)}</fieldset>
    {form.formState.errors.root && <p role="alert" className="form-error">{form.formState.errors.root.message}</p>}
    <Button type="submit" className="w-full" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیرهٔ رمز جدید'}</Button>
  </form>
}
