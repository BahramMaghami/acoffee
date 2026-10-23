'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Package, ShoppingBag } from 'lucide-react'

export function AdminNav() {
  const pathname = usePathname()
  const links = [
    { href: '/admin', label: 'داشبورد', Icon: LayoutDashboard },
    { href: '/admin/users', label: 'کاربران', Icon: Users },
    { href: '/admin/orders', label: 'سفارش‌ها', Icon: ShoppingBag },
    { href: '/admin/products', label: 'محصولات', Icon: Package },
  ]
  return <nav className="shell admin-nav" aria-label="بخش‌های مدیریت">
    {links.map(({ href, label, Icon }) => <Link key={href} href={href}
      aria-current={(href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined}>
      <Icon size={17} aria-hidden="true" />{label}
    </Link>)}
  </nav>
}
