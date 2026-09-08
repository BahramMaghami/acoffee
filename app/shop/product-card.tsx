import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpLeft } from 'lucide-react'
import { formatPrice, type StoreProduct } from '@/lib/storefront'

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <article className="product-card">
      <Link
        href={`/shop/${product.slug}`}
        className="product-image-link"
        aria-label={`مشاهدهٔ ${product.name}`}
      >
        <Image
          src={product.image}
          alt={`بستهٔ ۲۵۰ گرمی ${product.name} آ`}
          fill
          sizes="(max-width: 580px) 95vw, (max-width: 900px) 46vw, 31vw"
        />
        <span className="product-badge">{product.badge}</span>
        <span className="product-image-number" dir="ltr">
          {product.number}
        </span>
        <span className="product-arrow">
          <ArrowUpLeft size={20} />
        </span>
      </Link>
      <div className="product-card-meta">
        <span>{product.composition}</span>
        <span>۲۵۰ گرم</span>
      </div>
      <h3>
        <Link href={`/shop/${product.slug}`}>{product.name}</Link>
      </h3>
      <p className="tasting-notes">{product.notes.join(' / ')}</p>
      <div className="product-card-price">
        <span>{formatPrice(product.price)}</span>
        <span dir="ltr">{product.englishName}</span>
      </div>
    </article>
  )
}
