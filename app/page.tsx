import Link from 'next/link'
import { ArrowLeft, Coffee, PackageCheck, Bean } from 'lucide-react'
import { HomeHero } from './home-hero'
import { ShopCatalog } from './shop/shop-catalog'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <section className="shell collection-section" id="coffee-selection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">قهوه‌های آ</span>
            <h2>قهوه‌ات را انتخاب کن.</h2>
          </div>
        </div>
        <ShopCatalog idPrefix="home" />
      </section>
      <div className="promise-strip shell">
        <div>
          <Bean />
          <span>انتخاب رست</span>
          <small>مدیوم یا مدیوم‌دارک، بسته به محصول</small>
        </div>
        <div>
          <Coffee />
          <span>انتخاب آسیاب</span>
          <small>متناسب با روشی که قهوه‌ات را دم می‌کنی</small>
        </div>
        <div>
          <PackageCheck />
          <span>انتخاب وزن</span>
          <small>بسته‌های خانگی و عمده</small>
        </div>
      </div>
      <section className="story-band">
        <div className="shell story-band-inner">
          <span className="story-letter" aria-hidden="true">
            a.
          </span>
          <div>
            <span className="eyebrow">کمی دربارهٔ ما</span>
            <h2>
              دربارهٔ آ
            </h2>
          </div>
          <div>
            <p>
              قهوه‌های آ برای مصرف خانگی، کافه‌ها و شرکت‌ها عرضه می‌شوند.
              در صفحهٔ هر محصول می‌توانی وزن، نوع قهوه و آسیاب را انتخاب کنی.
            </p>
            <Link className="quiet-link" href="/about">
              داستان آ <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell brew-teaser">
        <div>
          <span className="eyebrow">دم‌آوری در خانه</span>
          <h2>راهنمای دم‌آوری قهوه</h2>
          <p>موکاپات، فرنچ‌پرس یا وی۶۰؟ از همین‌جا شروع کن.</p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/guide">
            راهنمای دم‌آوری <ArrowLeft />
          </Link>
        </Button>
      </section>
    </>
  )
}
