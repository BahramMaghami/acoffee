'use client'

import { useState, type ReactNode } from 'react'
import { hasVariantDiscount, productVariant, type StoreProduct } from '@/lib/storefront'
import { ProductVisual } from '../product-visual'
import { DiscountRibbon } from '../discount-ribbon'
import { ProductPurchase, type ProductSelection } from './product-purchase'

export function ProductDetail({ product, initialSelection, children }: {
  product: StoreProduct; initialSelection: ProductSelection; children: ReactNode
}) {
  const [selection, setSelection] = useState(initialSelection)
  const variant = productVariant(product, selection.weight, selection.roast, selection.grade)
  return <div className="product-detail">
    <div className="detail-image">
      <ProductVisual name={product.name} imageUrl={product.imageUrl} sizes="(max-width: 760px) 100vw, 50vw" />
      {variant && hasVariantDiscount(variant) && <DiscountRibbon percent={variant.discountPercent} weight={variant.weightGrams} />}
      <span className="detail-image-caption" dir="ltr">ACOFFEE</span>
    </div>
    <div className="detail-copy">{children}<ProductPurchase product={product} initialWeight={initialSelection.weight} selection={selection} onSelectionChange={setSelection} /></div>
  </div>
}
