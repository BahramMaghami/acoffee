'use client'
import { Button } from '@/components/ui/button'

export default function UsersError({ reset }: { reset: () => void }) {
  return <div className="shell empty-state page-space">
    <h1>فهرست کاربران دریافت نشد.</h1>
    <p>دوباره تلاش کن.</p>
    <Button onClick={reset}>تلاش دوباره</Button>
  </div>
}
