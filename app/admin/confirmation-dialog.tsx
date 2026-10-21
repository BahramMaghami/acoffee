'use client'

import { useEffect, useId, useRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ConfirmationDialog({ title, description, confirmLabel, pending, error, onCancel, onConfirm }: {
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    cancelButton.current?.focus()
    return () => element.close()
  }, [])

  return <dialog ref={dialog} className="admin-confirm-dialog" dir="rtl"
    aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending}
    onCancel={(event) => { event.preventDefault(); if (!pending) onCancel() }}>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    {error && <p role="alert" className="admin-confirm-error">{error}</p>}
    <div className="admin-confirm-actions">
      <Button ref={cancelButton} variant="outline" disabled={pending} onClick={onCancel}>انصراف</Button>
      <Button disabled={pending} onClick={onConfirm}>
        {pending ? <><LoaderCircle className="animate-spin" aria-hidden="true" />در حال انجام…</> : confirmLabel}
      </Button>
    </div>
  </dialog>
}
