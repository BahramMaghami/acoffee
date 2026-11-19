import type { Metadata } from 'next'
import { StorefrontImage } from '../storefront-image'
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
            آ طعمی اصیل
          </h1>
          <p className="about-lead">
            آ مجموعه‌ای از قهوه‌های ترکیبی، تک‌دان و سنتی را برای سفارش آنلاین ارائه می‌کند.
          </p>
          <p>
            در صفحهٔ هر محصول، وزن بسته و گزینه‌های رست و آسیاب را ببین
            و متناسب با مصرف خودت انتخاب کن.
          </p>
          <p>
            برای کافه‌ها و شرکت‌ها نیز بسته‌های عمده در دستهٔ جداگانه در دسترس است.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">
              مشاهدهٔ قهوه‌ها <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="about-photo">
          <StorefrontImage
            alt="بستهٔ قهوه آ"
            priority
            sizes="(max-width: 760px) 95vw, 45vw"
          />
        </div>
      </div>
    </div>
  )
}
