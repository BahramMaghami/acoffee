'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { manualPaymentSchema } from '@/lib/validators/payment'
import { recordManualPaymentAction, voidManualPaymentAction, checkPaymentAction } from '@/actions/payment.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmationDialog } from '../confirmation-dialog'
import { formatPrice } from '@/lib/storefront'

const fields = manualPaymentSchema.pick({ note: true, reference: true })
export function ManualPaymentForm({ orderId, updatedAt, amount, canManual, active, voidPaymentId, enabled }: {
  orderId: string; updatedAt: string; amount: number; canManual: boolean; active: boolean; voidPaymentId?: string; enabled: boolean
}) {
  const form = useForm<z.infer<typeof fields>>({ resolver: zodResolver(fields), defaultValues: { note: '', reference: '' } })
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<'record' | 'void' | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()
  function submit(operation: 'record' | 'void' | 'check') {
    setMessage('')
    startTransition(async () => {
      try {
        const input = { orderId, expectedUpdatedAt: updatedAt, ...form.getValues() }
        const response = await (operation === 'check' ? checkPaymentAction({ orderId }) : operation === 'record' ? recordManualPaymentAction(input) : voidManualPaymentAction({ ...input, paymentId: voidPaymentId }))
        if (!response.success) { form.setError('root', { message: response.message }); return }
        setConfirm(null); form.reset(); setMessage(response.message); router.refresh()
      } catch { form.setError('root', { message: 'ارتباط برقرار نشد؛ ابتدا وضعیت پرداخت را بررسی کن.' }) }
    })
  }
  return <div className="manual-payment" aria-busy={pending}>
    {active && <Button variant="outline" disabled={pending || !enabled} onClick={() => submit('check')}>بررسی پرداخت</Button>}
    {(canManual || voidPaymentId) && enabled && <form noValidate onSubmit={form.handleSubmit(() => { form.clearErrors('root'); setConfirm(voidPaymentId ? 'void' : 'record') })}>
      <p>مبلغ ثبت‌شده: <strong>{formatPrice(amount)}</strong></p>
      {!voidPaymentId && <div><label htmlFor="manual-reference">شمارهٔ رسید (اختیاری)</label><Input id="manual-reference" dir="ltr" {...form.register('reference')} disabled={pending} /><p className="field-error">{form.formState.errors.reference?.message}</p></div>}
      <div><label htmlFor="manual-note">{voidPaymentId ? 'دلیل ابطال ثبت دستی' : 'توضیح و دلیل پرداخت خارج از درگاه'}</label><Input id="manual-note" {...form.register('note')} disabled={pending} /><p className="field-error">{form.formState.errors.note?.message}</p></div>
      <Button type="submit" variant="outline" disabled={pending}>{voidPaymentId ? 'ابطال ثبت دستی' : 'ثبت پرداخت خارج از درگاه'}</Button>
    </form>}
    {message && <p role="status">{message}</p>}
    {form.formState.errors.root && !confirm && <p role="alert">{form.formState.errors.root.message}</p>}
    {confirm && <ConfirmationDialog title={confirm === 'record' ? 'ثبت پرداخت خارج از درگاه' : 'ابطال ثبت دستی'} description={confirm === 'record' ? 'دریافت کامل مبلغ سفارش را تأیید می‌کنی؟ نام مدیر، زمان و توضیح ثبت می‌شود.' : 'ثبت دستی ابطال می‌شود؛ سابقه و سهمیهٔ مصرف‌شدهٔ تخفیف باقی می‌مانند. این کار بازپرداخت بانکی انجام نمی‌دهد.'} confirmLabel="ثبت تغییر" pending={pending} error={form.formState.errors.root?.message ?? null} onCancel={() => setConfirm(null)} onConfirm={() => submit(confirm)} />}
  </div>
}
