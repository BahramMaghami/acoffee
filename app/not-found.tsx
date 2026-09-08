import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="shell empty-state page-space">
      <span className="eyebrow">۴۰۴</span>
      <h1>این صفحه را پیدا نکردیم.</h1>
      <p>از مجموعهٔ قهوه‌ها، راهت را دوباره پیدا کن.</p>
      <Button asChild>
        <Link href="/shop">بازگشت به قهوه‌ها</Link>
      </Button>
    </div>
  )
}
