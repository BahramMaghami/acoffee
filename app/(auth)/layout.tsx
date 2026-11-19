import { StorefrontImage } from '../storefront-image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="shell auth-page">
      <Link href="/shop" className="quiet-link auth-back">
        <ArrowRight size={16} />
        بازگشت به قهوه‌ها
      </Link>
      <div className="auth-layout">
        <div className="auth-form-panel">{children}</div>
        <aside className="auth-photo">
          <StorefrontImage
            alt="بستهٔ قهوه آ"
            sizes="(max-width: 760px) 0px, 45vw"
            priority
          />
          <div className="auth-photo-copy">
            <span dir="ltr">A COFFEE ROASTERY</span>
            <p>
              آ طعمی اصیل
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
