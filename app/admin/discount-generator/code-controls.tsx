'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setDiscountCodeStatusAction } from '@/actions/discount-code.actions'

export function CodeControls({ id, code, isActive, updatedAt }: { id: string; code: string; isActive: boolean; updatedAt: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return <div className="coupon-controls"><Button size="sm" variant="outline" type="button" onClick={async () => {
    try { await navigator.clipboard.writeText(code); setMessage('کد کپی شد.') } catch { setMessage('کپی خودکار ممکن نیست؛ متن کد را انتخاب و کپی کن.') }
  }}>کپی</Button><Button size="sm" variant="outline" disabled={pending} type="button" onClick={() => {
    setMessage(''); startTransition(async () => {
      try { const result = await setDiscountCodeStatusAction({ id, expectedUpdatedAt: updatedAt, isActive: !isActive }); setMessage(result.message); if (result.success) router.refresh() }
      catch { setMessage('تغییر وضعیت انجام نشد؛ دوباره تلاش کن.') }
    })
  }}>{pending ? 'در حال ذخیره…' : isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}</Button>{message && <p role="status">{message}</p>}</div>
}
