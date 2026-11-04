'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { placeOrderAction } from '@/actions/order.actions'
import { shippingSelectionSchema } from '@/lib/validators/checkout'
import { shippingMethods, type ShippingMethod } from '@/lib/order-options'

export function PlaceOrderButton({ checkoutKey, quoteHash, initialShippingMethod = null }: { checkoutKey: string; quoteHash: string; initialShippingMethod?: ShippingMethod | null }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const form = useForm<{ shippingMethod: ShippingMethod }>({ resolver: zodResolver(shippingSelectionSchema), defaultValues: { shippingMethod: initialShippingMethod ?? undefined } })
  return <form className="delivery-form" noValidate aria-busy={pending} onSubmit={form.handleSubmit(values => {
    setError('')
    startTransition(async () => {
      try {
        const result = await placeOrderAction({ checkoutKey, quoteHash, ...values })
        if (!result.success) { setError(result.message); return }
        router.replace(`/orders/${result.orderId}`)
      } catch { setError('ارتباط برقرار نشد. دوباره تلاش کن؛ سفارشت تکراری ثبت نمی‌شود.') }
    })
  })}>
    <div className="form-field">
      <label htmlFor="shipping-method">روش دریافت سفارش</label>
      <select id="shipping-method" {...form.register('shippingMethod')} disabled={pending} aria-invalid={Boolean(form.formState.errors.shippingMethod)} aria-describedby="shipping-method-error shipping-method-note">
        <option value="">روش دریافت را انتخاب کن</option>
        {shippingMethods.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
      </select>
      <p id="shipping-method-error" className="field-error">{form.formState.errors.shippingMethod?.message}</p>
      <p id="shipping-method-note">{initialShippingMethod ? 'انتخاب سفارش قبلی پیشنهاد شده؛ می‌توانی آن را تغییر بدهی.' : 'روش دریافت این سفارش را مشخص کن.'}</p>
    </div>
    <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />در حال ثبت…</> : <>ثبت سفارش و ادامه <ArrowLeft /></>}</Button>
    {error && <div><p className="form-error" role="alert">{error}</p><Button type="button" variant="ghost" onClick={() => router.refresh()}>تازه‌کردن اطلاعات</Button></div>}
  </form>
}
