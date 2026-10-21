'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { manageOrderAction } from '@/actions/order.actions'
import { ConfirmationDialog } from '../confirmation-dialog'

export function OrderControls({ id, number, updatedAt, paid, delivered, detail = false }: {
  id: string; number: string; updatedAt: string; paid: boolean; delivered: boolean; detail?: boolean
}) {
  const router = useRouter()
  const [operation, setOperation] = useState<'delete' | 'paid' | 'delivered' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const value = operation === 'paid' ? !paid : !delivered
  const title = operation === 'delete' ? 'حذف سفارش' : operation === 'paid' ? 'تغییر وضعیت پرداخت' : 'تغییر وضعیت تحویل'
  const description = operation === 'delete'
    ? `سفارش شمارهٔ ${number} و تمام اقلام آن برای همیشه حذف می‌شوند. این کار قابل بازگشت نیست و پرداختی را بازپرداخت نمی‌کند.`
    : operation === 'paid'
      ? (value ? 'پرداخت این سفارش را تأیید می‌کنی؟ زمان فعلی به‌عنوان زمان تأیید پرداخت ثبت می‌شود. این کار صرفاً ثبت وضعیت است و تراکنش بانکی انجام نمی‌دهد.' : 'تأیید پرداخت و تاریخ آن پاک شود؟ سفارش به پرداخت‌نشده تغییر می‌کند؛ بازپرداخت بانکی انجام نمی‌شود.')
      : (value ? 'تحویل این سفارش را تأیید می‌کنی؟ زمان فعلی به‌عنوان زمان تأیید تحویل ثبت می‌شود.' : 'تأیید تحویل و تاریخ آن پاک شود؟ سفارش به وضعیت در انتظار آماده‌سازی برمی‌گردد.')

  function open(next: 'delete' | 'paid' | 'delivered') { setError(null); setOperation(next) }
  function confirm() {
    if (!operation || pending) return
    setError(null)
    startTransition(async () => {
      try {
        const target = { orderId: id, expectedUpdatedAt: updatedAt }
        const result = await manageOrderAction(operation === 'delete'
          ? { ...target, operation: 'delete' }
          : { ...target, operation: 'status', field: operation, value })
        if (!result.success) { setError(result.message); return }
        setOperation(null)
        toast.success(result.message)
        if (operation === 'delete' && detail) router.replace('/admin/orders')
      } catch { setError('عملیات انجام نشد. صفحه را تازه کن و دوباره تلاش کن.') }
    })
  }
  return <div className="admin-order-controls" aria-busy={pending}>
    {detail && <>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => open('paid')}>{paid ? 'لغو تأیید پرداخت' : 'تأیید پرداخت'}</Button>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => open('delivered')}>{delivered ? 'لغو تأیید تحویل' : 'تأیید تحویل'}</Button>
    </>}
    <Button variant="ghost" size="sm" className="admin-order-delete" disabled={pending} onClick={() => open('delete')}>حذف سفارش</Button>
    {operation && <ConfirmationDialog title={title} description={description} confirmLabel={operation === 'delete' ? 'حذف دائمی سفارش' : 'ثبت تغییر'} pending={pending} error={error} onCancel={() => setOperation(null)} onConfirm={confirm} />}
  </div>
}
