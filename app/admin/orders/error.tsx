'use client'
import { Button } from '@/components/ui/button'
export default function AdminOrdersError({ retry }: { retry: () => void }) {
  return <div className="shell page-space empty-state"><h1>اطلاعات سفارش دریافت نشد.</h1><p>ارتباط با سرور را بررسی کن و دوباره تلاش کن.</p><Button onClick={retry}>تلاش دوباره</Button></div>
}
