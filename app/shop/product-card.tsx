import { ProductVisual } from './product-visual'
import Link from 'next/link'
import { ArrowUpLeft } from 'lucide-react'
import { categories, cafeGroups, startingPrice, formatPrice, type StoreProduct } from '@/lib/storefront'

export function ProductCard({ product }: { product: StoreProduct }) {
  const price = startingPrice(product)
  const category = categories.find((category) => category.value === product.category)!.label
  return <article className="product-card">
    <Link href={'/shop/' + product.slug} className="product-image-link" aria-label={'مشاهدهٔ ' + product.name}>
      <ProductVisual name={product.name} />
      <span className="product-badge">{product.cafeGroup ? cafeGroups.find((group) => group.value === product.cafeGroup)!.label : category}</span>
      <span className="product-arrow"><ArrowUpLeft size={20} /></span>
    </Link>
    <div className="product-card-meta"><span>{category}</span><span>انتخاب وزن در سفارش</span></div>
    <h3><Link href={'/shop/' + product.slug}>{product.name}</Link></h3>
    {product.grades.length > 1 && <p className="tasting-notes">معمولی / VIP</p>}
    <div className="product-card-price"><span>{price === null ? 'قیمت به‌زودی' : 'از ' + formatPrice(price)}</span><Link href={'/shop/' + product.slug}>انتخاب قهوه</Link></div>
  </article>
}
