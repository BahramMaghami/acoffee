import type { Metadata } from 'next'
import { ProductVisual } from '../product-visual'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ArrowLeft } from 'lucide-react'
import { cafeGroups, hasWholesaleDiscount } from '@/lib/storefront'
import { getStoreCatalog } from '@/lib/catalog'
import { ProductPurchase } from './product-purchase'
import { ProductCard } from '../product-card'
import { CafeOffer } from '../cafe-offer'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { products } = await getStoreCatalog()
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  return { title: product?.name ?? 'قهوه پیدا نشد', description: product?.description }
}
export default async function ProductPage({ params, searchParams }: PageProps<'/shop/[slug]'>) {
  const { products } = await getStoreCatalog()
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  if (!product) notFound()
  const query = await searchParams
  const initialWeight = product.weights.find(weight => String(weight) === query.weight)
    ?? (product.weights.includes(250) ? 250 : product.weights[0])
  const category = product.categoryLabel
  return <div className="shell page-space">
    <nav className="breadcrumbs" aria-label="مسیر صفحه">
      <Link href="/">خانه</Link><ChevronLeft /><Link href="/shop">قهوه‌های ما</Link><ChevronLeft /><span>{product.name}</span>
    </nav>
    <div className="product-detail">
      <div className="detail-image">
        <ProductVisual name={product.name} imageUrl={product.imageUrl} sizes="(max-width: 760px) 100vw, 50vw" />
        {hasWholesaleDiscount(product) && (
          <span className="wholesale-ribbon"><strong>۳٪ تخفیف</strong><span>بستهٔ ۱۰ کیلویی</span></span>
        )}
        <span className="detail-image-caption" dir="ltr">ACOFFEE</span>
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{category}{product.cafeGroup ? ' / ' + cafeGroups.find((group) => group.value === product.cafeGroup)!.label : ''}</span>
        <h1>{product.name}</h1>
        <p className="detail-description">{product.description}</p>
        {product.origin && <dl className="product-facts"><div><dt>خاستگاه</dt><dd>{product.origin}</dd></div></dl>}
        <ProductPurchase key={`${product.id}:${initialWeight}`} product={product} initialWeight={initialWeight} />
      </div>
    </div>
    {product.category === 'wholesale' && <CafeOffer />}
    <section className="related-products">
      <div className="section-heading"><h2>قهوه‌های دیگر</h2><Link className="quiet-link" href="/shop">همهٔ قهوه‌ها <ArrowLeft size={17} /></Link></div>
      <div className="product-grid related-grid">{products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 3).map((item) => <ProductCard product={item} key={item.id} />)}</div>
    </section>
  </div>
}
