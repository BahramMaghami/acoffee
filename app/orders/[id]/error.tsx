'use client'
import { Button } from '@/components/ui/button'
export default function OrderError({ reset }: { reset: () => void }) {
  return (
    <div className="shell empty-state">
      <h2>سفارش دریافت نشد.</h2>
      <p>ارتباط را بررسی کن و دوباره تلاش کن.</p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  )
}
