import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import './auth.css'
import './brand-theme.css'
import { getCurrentUser } from '@/lib/current-user'
import { defaultTheme, themeScript } from './theme'
import { BrandIntro } from './brand-intro'
import { introScript } from './intro'
import './brand-intro.css'

export const metadata: Metadata = {
  title: { default: 'آ طعمی اصیل', template: '%s | آ' },
  description:
    'آ طعمی اصیل؛ خرید قهوهٔ ترکیبی، تک‌دان و سنتی با انتخاب وزن، رست و نوع آسیاب.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // The public shell must survive a temporary DB error without deleting cookies.
  const user = await getCurrentUser().catch(() => null)
  const headerUser = user ? { name: user.name, email: user.email, role: user.role } : null
  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth" className="h-full antialiased" data-theme={defaultTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>
        <BrandIntro />
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
