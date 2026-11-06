'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDiscountCodeSchema, type DiscountCodeFormInput } from '@/lib/validators/discount-codes'
import { createDiscountCodeAction } from '@/actions/discount-code.actions'
import { formatPersianDateTime } from '@/lib/date'

export function DiscountForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [created, setCreated] = useState<{ code: string; expiresAt: string } | null>(null)
  const form = useForm<DiscountCodeFormInput, unknown, z.output<typeof createDiscountCodeSchema>>({ resolver: zodResolver(createDiscountCodeSchema),
    defaultValues: { type: 'PERCENT', value: '', maxUsers: '', maxUsesPerUser: '1', validDays: '7' } })
  const type = useWatch({ control: form.control, name: 'type' })
  return <form className="discount-code-form" aria-label="ساخت کد تخفیف" noValidate onSubmit={form.handleSubmit(() => {
    form.clearErrors('root'); setCreated(null)
    startTransition(async () => {
      try {
        const result = await createDiscountCodeAction(form.getValues())
        if (!result.success) { form.setError('root', { message: result.message }); return }
        setCreated(result); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد؛ ورودی‌ها محفوظ‌اند. دوباره تلاش کن.' }) }
    })
  })}>
    <h2>کد جدید</h2><p>کد تصادفی و یکتا هنگام ذخیره ساخته می‌شود.</p>
    <fieldset disabled={pending}>
      <div className="form-field"><label htmlFor="coupon-type">نوع تخفیف</label><select id="coupon-type" {...form.register('type')}><option value="PERCENT">درصدی</option><option value="FIXED">مبلغ ثابت به تومان</option></select></div>
      {(['value', 'maxUsers', 'maxUsesPerUser', 'validDays'] as const).map(name => {
        const labels = { value: type === 'PERCENT' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)', maxUsers: 'حداکثر کاربران متفاوت', maxUsesPerUser: 'دفعات استفادهٔ هر کاربر', validDays: 'اعتبار از زمان ساخت (روز)' }
        return <div className="form-field" key={name}><label htmlFor={`coupon-${name}`}>{labels[name]}</label><Input id={`coupon-${name}`} inputMode="numeric" {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`coupon-${name}-error`} /><p className="field-error" id={`coupon-${name}-error`}>{form.formState.errors[name]?.message}</p></div>
      })}
      <Button type="submit">{pending ? 'در حال ساخت…' : 'ساخت کد تخفیف'}</Button>
    </fieldset>
    {form.formState.errors.root && <p className="form-error" role="alert">{form.formState.errors.root.message}</p>}
    {created && <div className="coupon-created" role="status"><strong>کد ساخته شد: <bdi>{created.code}</bdi></strong><p>معتبر تا {formatPersianDateTime(created.expiresAt)}</p></div>}
  </form>
}
