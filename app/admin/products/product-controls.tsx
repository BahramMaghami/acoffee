'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteProductAction } from '@/actions/product.actions'
import { ConfirmationDialog } from '../confirmation-dialog'

export function ProductControls({ id, name, updatedAt }: { id: string; name: string; updatedAt: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return <><Button variant="ghost" size="sm" onClick={() => { setError(null); setOpen(true) }}>حذف</Button>
    {open && <ConfirmationDialog title="حذف محصول" description={`«${name}» و همهٔ انتخاب‌هایش حذف می‌شوند و از سبدهای ذخیره‌شده کنار می‌روند. سوابق سفارش‌ها باقی می‌مانند.`} confirmLabel="حذف دائمی محصول" pending={pending} error={error} onCancel={() => setOpen(false)} onConfirm={() => startTransition(async () => {
      try { const result = await deleteProductAction({ id, expectedUpdatedAt: updatedAt }); if (!result.success) setError(result.message); else { setOpen(false); toast.success(result.message) } }
      catch { setError('حذف انجام نشد؛ دوباره تلاش کن.') }
    })} />}
  </>
}
