'use client'
import { Button } from '@/components/ui/button'

export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <div className="shell page-space empty-state">
      <h1>سفارش‌ها دریافت نشد.</h1>
      <p>دوباره تلاش کن.</p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  )
}
