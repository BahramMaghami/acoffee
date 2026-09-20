import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { products, visibleCategories, formatNumber } from '@/lib/storefront'
import { ProductCard } from '../../product-card'
import { CafeOffer } from '../../cafe-offer'

type CategoryPageProps = { params: Promise<{ category: string }> }

export function generateStaticParams() {
  return visibleCategories.map(({ value }) => ({ category: value }))
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  const selected = visibleCategories.find((item) => item.value === category)
  if (!selected) notFound()
  return { title: selected.label }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params
  const selected = visibleCategories.find((item) => item.value === category)
  if (!selected) notFound()
  const items = products.filter((product) => product.category === selected.value)

  return (
    <div className="shell page-space">
      <nav className="breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">خانه</Link><ChevronLeft /><Link href="/shop">قهوه‌های ما</Link><ChevronLeft /><span>{selected.label}</span>
      </nav>
      <div className="page-heading">
        <div><span className="eyebrow">مجموعهٔ آ</span><h1>{selected.label}</h1><p>{formatNumber(items.length)} قهوه برای انتخاب</p></div>
      </div>
      <div className="product-grid">
        {items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {selected.value === 'cafe' && <CafeOffer />}
    </div>
  )
}
