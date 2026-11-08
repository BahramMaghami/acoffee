'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  startPaymentAction,
  checkPaymentAction,
  prepareOrderRepriceAction,
} from '@/actions/payment.actions'
import { useCart } from '@/app/cart/cart-store'
import { ConfirmationDialog } from '@/app/admin/confirmation-dialog'

export function PaymentControls({
  orderId,
  settled,
  active,
  canStart,
  canReprice,
  enabled,
}: {
  orderId: string
  settled: boolean
  active: boolean
  canStart: boolean
  canReprice: boolean
  enabled: boolean
}) {
  // this is just for testing for payment and this should be asked from chatgpt
  // canReprice = false
  // canStart = true

  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()
  const cart = useCart()
  function run(operation: 'pay' | 'check' | 'reprice') {
    setMessage('')
    startTransition(async () => {
      try {
        if (operation === 'reprice') {
          const result = await prepareOrderRepriceAction({ orderId })
          if (!result.success) {
            setMessage(result.message)
            return
          }
          cart.replace(result.items)
          setConfirm(false)
          router.push('/cart')
          return
        }
        const result = await (
          operation === 'pay' ? startPaymentAction : checkPaymentAction
        )({ orderId })
        setMessage(result.message)
        if (result.success && result.redirectUrl) {
          window.location.assign(result.redirectUrl)
          return
        }
        router.refresh()
      } catch {
        setMessage(
          'ارتباط برقرار نشد؛ دوباره پرداخت نکن و وضعیت سفارش را بررسی کن.',
        )
      }
    })
  }
  return (
    <div className="payment-controls" aria-busy={pending}>
      {!enabled && !settled && <p>درگاه برای این محیط هنوز آماده نیست.</p>}
      {!settled && enabled && (
        <>
          {canStart && (
            <Button disabled={pending} onClick={() => run('pay')}>
              پرداخت سفارش
            </Button>
          )}
          {active && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run('check')}
            >
              بررسی وضعیت پرداخت
            </Button>
          )}
          {canReprice && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirm(true)}
            >
              بررسی قیمت روز و پرداخت
            </Button>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {confirm && (
        <ConfirmationDialog
          title="بررسی قیمت روز"
          description="اقلام این سفارش جایگزین سبد فعلی می‌شوند. قیمت‌ها دوباره محاسبه می‌شوند و انتخاب‌های ناموجود یا ناقص نیاز به اصلاح دارند. کد تخفیف قبلی منتقل نمی‌شود. پیش از ثبت سفارش جدید، مبلغ را دوباره تأیید می‌کنی."
          confirmLabel="انتقال به سبد و بررسی"
          pending={pending}
          error={message || null}
          onCancel={() => setConfirm(false)}
          onConfirm={() => run('reprice')}
        />
      )}
    </div>
  )
}
