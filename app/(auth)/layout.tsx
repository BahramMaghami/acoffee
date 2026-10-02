import Image from 'next/image'
import { storefrontImage } from '@/lib/storefront'
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
          <Image
            src={storefrontImage}
            style={{ objectFit: 'contain', backgroundColor: '#151515' }}
            alt="بستهٔ قهوه آ"
            fill
            sizes="(max-width: 760px) 0px, 45vw"
            preload
          />
          <div className="auth-photo-copy">
            <span dir="ltr">A LITTLE RITUAL. A BETTER DAY.</span>
            <p>
              فنجان تو،
              <br />
              جای تو، لحظهٔ تو.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
