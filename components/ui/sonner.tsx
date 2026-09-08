'use client'

import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      dir="rtl"
      position="top-center"
      offset={104}
      mobileOffset={{ top: 88, right: 16, left: 16 }}
      closeButton
      duration={6000}
      containerAriaLabel="اعلان‌ها"
      style={
        {
          fontFamily: 'var(--font-sans)',
          '--normal-bg': 'var(--background)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      toastOptions={{
        className: 'acoffee-toast',
        closeButtonAriaLabel: 'بستن پیام',
        actionButtonStyle: {
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          fontFamily: 'inherit',
          minHeight: 36,
        },
      }}
      {...props}
    />
  )
}
