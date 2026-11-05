'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowUpLeft,
  Menu,
  Coffee,
  ShoppingBag,
  X,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from './cart/cart-store'
import { formatNumber } from '@/lib/storefront'
import { UserMenu, type HeaderUser } from './user-menu'
import { ThemeToggle } from './theme-toggle'

const links = [
  { href: '/shop', label: 'قهوه‌های ما' },
  { href: '/about', label: 'داستان ما' },
  { href: '/guide', label: 'راهنمای دم‌آوری' },
]

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { count } = useCart()
  return (
    <>
      <div className="announcement">
        <span>یک مکث کوتاه، یک قهوهٔ خوب.</span>
        <Link href="/shop">
          فنجان بعدی‌ات را پیدا کن <ArrowUpLeft size={13} />
        </Link>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Link
            href="/"
            className="wordmark wordmark-fa"
            aria-label="آ، صفحهٔ اصلی"
            onClick={() => setOpen(false)}
          >
            <svg className="brand-monogram" viewBox="0 0 48 56" aria-hidden="true" focusable="false">
              <path d="M27 22 33 19.5 32 47.5Q29 49 26 47Z" />
              <path d="M18 14Q23 5 29 10Q35 15 39 8L40 10Q36 20 29 15Q23 10 18 17Z" />
              <circle cx="15" cy="46" r="2.5" />
            </svg>
          </Link>
          <nav className="desktop-nav" aria-label="منوی اصلی">
            {links.map((link) => (
              <Link
                aria-current={pathname === link.href ? 'page' : undefined}
                key={link.href}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            {user?.role === 'ADMIN' && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="admin-header-link"
              >
                <Link
                  href="/admin"
                  aria-label="پنل مدیریت"
                  aria-current={pathname === '/admin' ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard />
                  <span>پنل مدیریت</span>
                </Link>
              </Button>
            )}
            <ThemeToggle />
            <UserMenu user={user} />
            <Button asChild variant="ghost" size="icon" className="search-link">
              <Link href="/shop" aria-label="مرور قهوه‌ها">
                <Coffee />
              </Link>
            </Button>
            <Link
              href="/cart"
              className="cart-link"
              aria-label={`سبد خرید، ${formatNumber(count)} کالا`}
            >
              <ShoppingBag size={19} />
              <span className="cart-label">سبد خرید</span>
              <span className="cart-count">{formatNumber(count)}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-toggle"
              aria-label={open ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-nav shell"
            aria-label="منوی موبایل"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
                <ArrowUpLeft size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}
