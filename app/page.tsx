import Link from 'next/link'
import { ArrowLeft, Coffee, PackageCheck, Bean } from 'lucide-react'
import { HomeHero } from './home-hero'
import { ProductCard } from './shop/product-card'
import { products } from '@/lib/storefront'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className="promise-strip shell">
        <div>
          <Bean />
          <span>دانه‌های منتخب</span>
          <small>هر طعم، با یک انتخاب خوب شروع می‌شود</small>
        </div>
        <div>
          <Coffee />
          <span>آسیاب برای فنجان تو</span>
          <small>متناسب با روشی که قهوه‌ات را دم می‌کنی</small>
        </div>
        <div>
          <PackageCheck />
          <span>عطر قهوه، در بسته می‌ماند</span>
          <small>بسته‌بندی با توجه به تازگی و کیفیت</small>
        </div>
      </div>
      <section className="shell collection-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">سلیقهٔ تو، انتخاب تو</span>
            <h2>فنجان بعدی‌ات اینجاست.</h2>
          </div>
          <Link className="quiet-link" href="/shop">
            همهٔ قهوه‌ها <ArrowLeft size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="story-band">
        <div className="shell story-band-inner">
          <span className="story-letter" aria-hidden="true">
            a.
          </span>
          <div>
            <span className="eyebrow">کمی دربارهٔ ما</span>
            <h2>
              قهوهٔ خوب،
              <br />
              بهانهٔ یک حال خوب.
            </h2>
          </div>
          <div>
            <p>
              آ از علاقه به همین لحظه‌های ساده شروع شد؛ عطر قهوه در خانه،
              فنجانی روی میز کار و گپی که کمی طولانی‌تر می‌شود. ما اینجاییم تا
              سهم کوچکی در این لحظه‌ها داشته باشیم.
            </p>
            <Link className="quiet-link" href="/about">
              داستان آ <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell brew-teaser">
        <div>
          <span className="eyebrow">از قهوه‌ات بیشتر لذت ببر</span>
          <h2>فنجان بهتر، با چند قدم ساده.</h2>
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
