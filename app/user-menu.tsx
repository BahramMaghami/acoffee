'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { LogOut, UserRound, LoaderCircle, ChevronDown } from 'lucide-react'
import { logoutAction } from '@/actions/user.actions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type HeaderUser = { name?: string | null; email?: string | null }

export function UserMenu({ user }: { user: HeaderUser | null }) {
  const [pending, startTransition] = useTransition()
  if (!user) {
    return <Link href="/login" className="auth-guest-link"><UserRound size={18} /><span>ورود/ثبت‌نام</span></Link>
  }
  const initial = Array.from(user.name?.trim() ?? '')[0]?.toLocaleUpperCase() || 'آ'
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger className="user-menu-trigger" aria-label={`حساب کاربری ${user.name ?? ''}`} disabled={pending}>
        <span className="user-avatar" aria-hidden="true">{pending ? <LoaderCircle size={16} className="animate-spin" /> : initial}</span>
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="user-menu-content">
        <DropdownMenuLabel><p className="user-menu-name">{user.name}</p><p className="user-menu-email" dir="ltr">{user.email}</p></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/account"><UserRound />حساب من</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTransition(async () => { await logoutAction() })} disabled={pending}>
          <LogOut />خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
