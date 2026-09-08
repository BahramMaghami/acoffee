import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import './auth.css'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: { default: 'آ | قهوه، به وقت خودت', template: '%s | آ' },
  description:
    'قهوه‌های آ؛ از ترکیب‌های شکلاتی و عمیق تا عربیکای روشن و میوه‌ای. قهوهٔ مناسب فنجانت را پیدا کن.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const session = await auth()
  const headerUser = session?.user ? { name: session.user.name, email: session.user.email } : null
  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth" className="h-full antialiased">
      <body>
        <a className="skip-link" href="#main-content">
          رفتن به محتوای صفحه
        </a>
        <SiteHeader user={headerUser} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  )
}
