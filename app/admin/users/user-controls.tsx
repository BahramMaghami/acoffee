'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { manageUserAction } from '@/actions/user.actions'
import { ConfirmationDialog } from './confirmation-dialog'

export function UserControls({ id, name, role, self, hasOrders }: {
  id: string; name: string; role: 'ADMIN' | 'CUSTOMER'; self: boolean; hasOrders: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [operation, setOperation] = useState<'delete' | 'role' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nextRole = role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN'
  function mutate() {
    if (!operation || pending) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await manageUserAction(operation === 'delete'
          ? { operation, userId: id } : { operation, userId: id, role: nextRole })
        if (result.success) {
          setOperation(null)
          toast.success(result.message)
        }
        else setError(result.message)
      } catch { setError('عملیات انجام نشد. صفحه را تازه کن و دوباره تلاش کن.') }
    })
  }
  if (self) return <span className="admin-user-hint">حساب شما</span>
  return <div className="admin-user-controls" aria-busy={pending}>
    <Button size="sm" variant="outline" disabled={pending} onClick={() => { setError(null); setOperation('role') }}>
      {role === 'ADMIN' ? 'تبدیل به کاربر' : 'تبدیل به مدیر'}
    </Button>
    <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" disabled={pending || hasOrders}
      title={hasOrders ? 'حساب دارای سفارش قابل حذف نیست' : undefined} onClick={() => { setError(null); setOperation('delete') }}>حذف</Button>
    {hasOrders && <span className="admin-user-hint">دارای سفارش</span>}
    {operation && <ConfirmationDialog
      title={operation === 'delete' ? 'حذف حساب کاربر' : 'تغییر نقش کاربر'}
      description={operation === 'delete'
        ? `حساب «${name}» همراه نشانی‌ها و سبد خریدش حذف می‌شود. این کار قابل بازگشت نیست.`
        : `نقش «${name}» به ${nextRole === 'ADMIN' ? 'مدیر' : 'کاربر'} تغییر می‌کند.${nextRole === 'ADMIN' ? ' این کاربر به پنل مدیریت دسترسی خواهد داشت.' : ' دسترسی این کاربر به پنل مدیریت قطع خواهد شد.'}`}
      confirmLabel={operation === 'delete' ? 'حذف حساب' : 'تأیید تغییر نقش'}
      pending={pending} error={error} onCancel={() => setOperation(null)} onConfirm={mutate}
    />}
  </div>
}
