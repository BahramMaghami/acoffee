import { StorefrontImage } from './storefront-image'
import Link from 'next/link'
import { ArrowLeft, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HomeHero() {
  return (
    <section className="shell hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="little-line" />
          قهوه‌های آ
        </div>
        <h1>
          آ
          <br />
          طعمی <span>اصیل</span>
        </h1>
        <p>
          قهوه را با وزن، رست و آسیاب موردنظرت سفارش بده.
        </p>
        <div className="hero-cta">
          <Button asChild size="lg">
            <Link href="#coffee-selection">
              قهوه‌ات را انتخاب کن <ArrowLeft />
            </Link>
          </Button>
          <Link className="quiet-link" href="/about">
            با آ آشنا شو <ArrowDownLeft size={17} />
          </Link>
        </div>
      </div>
      <div className="hero-visual">
        <StorefrontImage
          alt="بستهٔ قهوه آ"
          priority
          sizes="(max-width: 760px) 100vw, 53vw"
        />
        <div className="hero-photo-caption">
          <span>قهوه‌های آ</span>
          <span dir="ltr">ACOFFEE</span>
        </div>
        <span className="photo-index" aria-hidden="true">
          a.
        </span>
      </div>
    </section>
  )
}
