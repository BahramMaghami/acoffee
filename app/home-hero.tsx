import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HomeHero() {
  return (
    <section className="shell hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="little-line" />
          قهوه، به وقت خودت
        </div>
        <h1>
          روز خوب،
          <br />
          از یک <span>فنجان</span>
          <br />
          شروع می‌شود.
        </h1>
        <p>
          گاهی همه‌چیز از یک مکث کوچک شروع می‌شود.
          <br className="desktop-break" /> قهوه‌ات را پیدا کن؛ بقیهٔ روز را به
          خودت بسپار.
        </p>
        <div className="hero-cta">
          <Button asChild size="lg">
            <Link href="/shop">
              قهوه‌ات را انتخاب کن <ArrowLeft />
            </Link>
          </Button>
          <Link className="quiet-link" href="/about">
            با آ آشنا شو <ArrowDownLeft size={17} />
          </Link>
        </div>
        <div className="hero-footnote">
          <span dir="ltr">A LITTLE RITUAL. A BETTER DAY.</span>
          <span>آیین کوچکِ هر روز</span>
        </div>
      </div>
      <div className="hero-visual">
        <Image
          src="/images/coffee-ritual.png"
          alt="بستهٔ قهوه آ کنار فنجان اسپرسو در نور گرم آفتاب"
          fill
          priority
          sizes="(max-width: 760px) 100vw, 53vw"
        />
        <div className="hero-photo-caption">
          <span>ترکیب روزانه</span>
          <span dir="ltr">NO. 01 — DAILY BLEND</span>
        </div>
        <span className="photo-index" aria-hidden="true">
          a.
        </span>
      </div>
    </section>
  )
}
