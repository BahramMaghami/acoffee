'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowUpLeft, Menu, Coffee, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from './cart/cart-store'
import { formatNumber } from '@/lib/storefront'
import { UserMenu, type HeaderUser } from './user-menu'

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
            className="wordmark"
            aria-label="آ، صفحهٔ اصلی"
            onClick={() => setOpen(false)}
          >
            acoffee<span>.</span>
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
