'use client'
import { Button } from '@/components/ui/button'

export default function AdminError({ reset }: { reset: () => void }) {
  return <div className="shell empty-state page-space"><h1>گزارش فروش دریافت نشد.</h1><p>ارتباط با سرور را بررسی کن و دوباره تلاش کن.</p><Button onClick={reset}>تلاش دوباره</Button></div>
}
