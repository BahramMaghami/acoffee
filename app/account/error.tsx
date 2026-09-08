'use client'
import { Button } from '@/components/ui/button'

export default function AccountError({ reset }: { reset: () => void }) {
  return (
    <div className="shell empty-state page-space">
      <h1>حسابت فعلاً بارگذاری نشد.</h1>
      <p>ارتباط را بررسی کن و دوباره تلاش کن.</p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  )
}
