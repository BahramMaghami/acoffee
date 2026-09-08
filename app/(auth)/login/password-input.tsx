'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function PasswordInput({
  label = 'رمز عبور',
  ...props
}: ComponentProps<'input'> & { label?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <Input
        {...props}
        dir="ltr"
        type={visible ? 'text' : 'password'}
        className="password-input"
      />
      <button
        type="button"
        aria-label={`${visible ? 'پنهان‌کردن' : 'نمایش'} ${label}`}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}
