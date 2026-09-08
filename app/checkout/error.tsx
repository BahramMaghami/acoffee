'use client'
import { Button } from '@/components/ui/button'
export default function CheckoutError({ reset }: { reset: () => void }) {
  return <div className="empty-state"><h2>اطلاعات خرید دریافت نشد.</h2><p>کمی بعد دوباره تلاش کن.</p><Button onClick={reset}>تلاش دوباره</Button></div>
}
