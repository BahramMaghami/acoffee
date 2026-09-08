'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { placeOrderAction } from '@/actions/order.actions'

export function PlaceOrderButton({ checkoutKey, quoteHash }: { checkoutKey: string; quoteHash: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  return <><Button size="lg" className="w-full" disabled={pending} onClick={() => {
    setError('')
    startTransition(async () => {
      try {
        const result = await placeOrderAction({ checkoutKey, quoteHash })
        if (!result.success) { setError(result.message); return }
        router.replace(`/orders/${result.orderId}`)
      } catch { setError('ارتباط برقرار نشد. دوباره تلاش کن؛ سفارشت تکراری ثبت نمی‌شود.') }
    })
  }}>{pending ? <><LoaderCircle className="animate-spin" />در حال ثبت…</> : <>ثبت سفارش و ادامه <ArrowLeft /></>}</Button>
    {error && <div><p className="form-error" role="alert">{error}</p><Button variant="ghost" onClick={() => router.refresh()}>تازه‌کردن اطلاعات</Button></div>}
  </>
}
