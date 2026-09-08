import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Check, ArrowLeft } from 'lucide-react'
import { products } from '@/lib/storefront'
import { ProductPurchase } from './product-purchase'
import { ProductCard } from '../product-card'

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }))
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  return {
    title: product?.name ?? 'قهوه پیدا نشد',
    description: product?.description,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  if (!product) notFound()
  return (
    <div className="shell page-space">
      <nav className="breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">خانه</Link>
        <ChevronLeft />
        <Link href="/shop">قهوه‌های ما</Link>
        <ChevronLeft />
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="detail-image">
          <Image
            src={product.image}
            alt={`بستهٔ ${product.name} آ`}
            fill
            priority
            sizes="(max-width: 760px) 95vw, 47vw"
          />
          <span className="detail-image-caption" dir="ltr">
            ACOFFEE / NO. {product.number}
          </span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow" dir="ltr">
            {product.englishName} / {product.number}
          </span>
          <h1>{product.name}</h1>
          <p className="detail-subtitle">{product.subtitle}</p>
          <div className="flavor-tags">
            {product.notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
          <p className="detail-description">{product.description}</p>
          <dl className="product-facts">
            <div>
              <dt>خاستگاه</dt>
              <dd>{product.origin}</dd>
            </div>
            <div>
              <dt>ترکیب دانه</dt>
              <dd>{product.composition}</dd>
            </div>
            <div>
              <dt>درجهٔ برشته‌کاری</dt>
              <dd>{product.roast}</dd>
            </div>
            <div>
              <dt>پیشنهاد دم‌آوری</dt>
              <dd>{product.brew}</dd>
            </div>
          </dl>
          <ProductPurchase product={product} />
          <p className="product-reassurance">
            <Check size={15} />
            آسیاب متناسب با روش دم‌آوری، در مرحلهٔ سفارش انتخاب می‌شود.
          </p>
        </div>
      </div>
      <section className="related-products">
        <div className="section-heading">
          <h2>طعم‌های دیگر را هم کشف کن.</h2>
          <Link className="quiet-link" href="/shop">
            همهٔ قهوه‌ها <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="product-grid related-grid">
          {products
            .filter((item) => item.id !== product.id)
            .map((item) => (
              <ProductCard product={item} key={item.id} />
            ))}
        </div>
      </section>
    </div>
  )
}
