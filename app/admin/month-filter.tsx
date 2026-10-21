'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dashboardMonthSchema } from '@/lib/validators/dashboard'
import { persianMonths } from '@/lib/persian-month'

export function MonthFilter({ year, month }: { year: number; month: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof dashboardMonthSchema>, unknown, z.output<typeof dashboardMonthSchema>>({
    resolver: zodResolver(dashboardMonthSchema), defaultValues: { year: String(year), month: String(month) },
  })
  return <form className="admin-month-filter" aria-label="گزارش ماه شمسی" aria-busy={pending} noValidate onSubmit={handleSubmit(value => {
    startTransition(() => router.push(`/admin?year=${value.year}&month=${value.month}`, { scroll: false }))
  })}>
    <div><label htmlFor="report-month">ماه شمسی</label><select id="report-month" {...register('month')} disabled={pending} aria-invalid={Boolean(errors.month)}>
      {persianMonths.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}
    </select></div>
    <div><label htmlFor="report-year">سال شمسی</label><Input id="report-year" inputMode="numeric" dir="ltr" maxLength={4} {...register('year')} disabled={pending} aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? 'report-year-error' : undefined} /></div>
    <Button type="submit" size="sm" disabled={pending}>{pending ? 'در حال دریافت…' : 'نمایش ماه'}</Button>
    {(errors.year || errors.month) && <p id="report-year-error" className="admin-month-error" role="alert">{errors.year?.message ?? errors.month?.message}</p>}
  </form>
}
