'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { applyDiscountCodeSchema } from '@/lib/validators/discount-codes'
import { applyDiscountCodeAction } from '@/actions/discount-code.actions'
import { formatPrice } from '@/lib/storefront'
import type { ShippingMethod } from '@/lib/order-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlaceOrderButton } from './place-order-button'

type Summary = { checkoutKey: string; quoteHash: string; subtotal: number; shippingFee: number; total: number }
export function CheckoutSummary({ quote, initialShippingMethod }: { quote: Summary; initialShippingMethod: ShippingMethod | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [placing, setPlacing] = useState(false)
  const [applied, setApplied] = useState<(Summary & { code: string; discount: number }) | null>(null)
  const form = useForm<{ code: string; checkoutKey: string; quoteHash: string }>({ resolver: zodResolver(applyDiscountCodeSchema), defaultValues: { code: '', checkoutKey: quote.checkoutKey, quoteHash: quote.quoteHash } })
  const current = applied ?? quote
  const typedCode = useWatch({ control: form.control, name: 'code' })
  const unapplied = Boolean(typedCode.trim()) && !applied
  return <aside className="order-summary">
    <span className="eyebrow">خلاصهٔ سفارش</span><h2>همه‌چیز آماده است</h2>
    <form className="checkout-coupon" aria-label="اعمال کد تخفیف" noValidate onSubmit={form.handleSubmit(values => {
      form.clearErrors('root'); setApplied(null)
      startTransition(async () => {
        try {
          const result = await applyDiscountCodeAction(values)
          if (!result.success) { form.setError('root', { message: result.message }); return }
          setApplied(result.quote)
        } catch { form.setError('root', { message: 'بررسی کد انجام نشد؛ دوباره تلاش کن.' }) }
      })
    })}>
      <label htmlFor="checkout-coupon-code">کد تخفیف</label>
      <div className="coupon-input-row"><Input id="checkout-coupon-code" dir="ltr" autoComplete="off" maxLength={40} disabled={pending || placing} aria-invalid={Boolean(form.formState.errors.code)} aria-describedby="checkout-coupon-error" {...form.register('code', { onChange: () => { setApplied(null); form.clearErrors('root') } })} />
      <Button type="submit" variant="outline" disabled={pending || placing}>{pending ? 'بررسی…' : 'اعمال کد'}</Button></div>
      <p id="checkout-coupon-error" className="field-error">{form.formState.errors.code?.message}</p>
      {unapplied && <div className="coupon-applied"><p>برای ادامه کد را اعمال یا پاک کن.</p><Button type="button" variant="ghost" disabled={pending || placing} onClick={() => form.reset()}>پاک کردن کد</Button></div>}
      {form.formState.errors.root && <div><p role="alert" className="form-error">{form.formState.errors.root.message}</p><Button type="button" variant="ghost" disabled={placing} onClick={() => router.refresh()}>تازه‌کردن اطلاعات</Button></div>}
      {applied && <div className="coupon-applied"><p role="status">کد <bdi>{applied.code}</bdi> اعمال شد.</p><Button type="button" variant="ghost" disabled={placing} onClick={() => { setApplied(null); form.reset(); }}>حذف کد</Button></div>}
    </form>
    <dl><div><dt>جمع کالاها</dt><dd>{formatPrice(current.subtotal)}</dd></div>
      {applied && <div><dt>تخفیف کد</dt><dd>− {formatPrice(applied.discount)}</dd></div>}
      <div><dt>هزینهٔ ارسال</dt><dd>هنوز تعیین نشده</dd></div>
      <div className="summary-total"><dt>جمع فعلی سفارش</dt><dd>{formatPrice(current.total)}</dd></div>
    </dl>
    <PlaceOrderButton checkoutKey={current.checkoutKey} quoteHash={current.quoteHash} discountCode={applied?.code} initialShippingMethod={initialShippingMethod} disabled={pending || unapplied} onPendingChange={setPlacing} />
    <p>سفارش با وضعیت «در انتظار پرداخت» ثبت می‌شود. هزینهٔ ارسال و پرداخت آنلاین در مرحلهٔ بعد فعال می‌شوند.</p>
  </aside>
}
