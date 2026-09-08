import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'داستان ما' }
export default function AboutPage() {
  return (
    <div className="shell page-space">
      <div className="about-layout">
        <div>
          <span className="eyebrow">داستان آ</span>
          <h1>
            برای یک مکث
            <br />
            خوش‌عطر.
          </h1>
          <p className="about-lead">
            ما به لحظه‌های کوچک باور داریم. به اینکه یک فنجان قهوه می‌تواند حال
            یک روز معمولی را عوض کند.
          </p>
          <p>
            آ قرار است همراه همین لحظه‌ها باشد؛ وقتی روزت را شروع می‌کنی،
            وسط کار کمی فاصله می‌گیری، یا برای یک دوست قهوه می‌ریزی. انتخاب ما
            ساده است: قهوه‌ای که با سلیقه‌ات جور باشد و از نوشیدنش لذت ببری.
          </p>
          <p>
            از ترکیب‌های آشنا و شکلاتی تا طعم‌های روشن و میوه‌ای، اینجا برای
            پیدا کردن فنجان خودت جا هست.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">
              فنجان خودت را پیدا کن <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="about-photo">
          <Image
            src="/images/coffee-ritual.png"
            alt="قهوه آ و یک فنجان اسپرسو در نور آفتاب"
            fill
            priority
            sizes="(max-width: 760px) 95vw, 45vw"
          />
        </div>
      </div>
      <div className="about-manifesto">
        <span className="eyebrow">چیزی که برایمان مهم است</span>
        <p>
          طعم خوب. انتخاب ساده.
          <br />
          <span>لذتِ هر روز.</span>
        </p>
      </div>
    </div>
  )
}
