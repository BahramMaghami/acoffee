import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ArrowLeft } from 'lucide-react'
import { cafeGroups } from '@/lib/storefront'
import { getStoreCatalog } from '@/lib/catalog'
import { ProductDetail } from './product-detail'
import { ProductCard } from '../product-card'
import { CafeOffer } from '../cafe-offer'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { products } = await getStoreCatalog()
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  return {
    title: product?.name ?? 'قهوه پیدا نشد',
    description: product?.description,
  }
}
export default async function ProductPage({
  params,
  searchParams,
}: PageProps<'/shop/[slug]'>) {
  const { products } = await getStoreCatalog()
  const { slug } = await params
  const product = products.find((item) => item.slug === slug)
  if (!product) notFound()
  const query = await searchParams
  const initialWeight =
    product.weights.find((weight) => String(weight) === query.weight) ??
    (product.weights.includes(250) ? 250 : product.weights[0])
  const category = product.categoryLabel
  const initialSelection = { weight: initialWeight,
    roast: product.roasts.find(roast => roast === query.roast) ?? product.roasts[0],
    grade: product.grades.find(grade => grade === query.grade) ?? product.grades[0] }
  return (
    <div className="shell page-space">
      <nav className="breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">خانه</Link>
        <ChevronLeft />
        <Link href="/shop">قهوه‌های ما</Link>
        <ChevronLeft />
        <span>{product.name}</span>
      </nav>
      <ProductDetail key={`${product.id}:${initialSelection.weight}:${initialSelection.roast}:${initialSelection.grade}`} product={product} initialSelection={initialSelection}>
          <span className="eyebrow">
            {category}
            {product.cafeGroup
              ? ' / ' +
                cafeGroups.find((group) => group.value === product.cafeGroup)!
                  .label
              : ''}
          </span>
          <h1>{product.name}</h1>
          <p className="detail-description">{product.description}</p>
          {product.origin && (
            <dl className="product-facts">
              <div>
                <dt>خاستگاه</dt>
                <dd>{product.origin}</dd>
              </div>
            </dl>
          )}
      </ProductDetail>
      {product.category === 'wholesale' && <CafeOffer />}
      <section className="related-products">
        <div className="section-heading">
          <h2>قهوه‌های دیگر</h2>
          <Link className="quiet-link" href="/shop">
            همهٔ قهوه‌ها <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="product-grid related-grid">
          {products
            .filter(
              (item) =>
                item.id !== product.id && item.category === product.category,
            )
            .slice(0, 3)
            .map((item) => (
              <ProductCard product={item} key={item.id} />
            ))}
        </div>
      </section>
    </div>
  )
}
