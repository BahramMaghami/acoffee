'use client'

import { ProductVisual } from '@/app/shop/product-visual'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { findVariant, maxCartQuantity, formatPrice, formatNumber } from '@/lib/storefront'
import { useCart } from './cart-store'

export function CartContent() {
  const { items, count, setQuantity } = useCart()
  const lines = items.flatMap((item) => {
    const variant = findVariant(item.productId)
    return variant ? [{ product: variant.product, variant, quantity: item.quantity }] : []
  })
  const subtotal = lines.reduce(
    (total, { variant, quantity }) => total + (variant.price ?? 0) * quantity,
    0,
  )
  const awaitingPrices = lines.some(({ variant }) => variant.price === null)
  if (!lines.length)
    return (
      <div className="empty-state cart-empty">
        <span className="empty-icon">
          <ShoppingBag size={36} strokeWidth={1.3} />
        </span>
        <h2>هنوز قهوه‌ات را انتخاب نکرده‌ای.</h2>
        <p>یک طعم تازه منتظر توست. از مجموعهٔ قهوه‌ها شروع کن.</p>
        <Button asChild size="lg">
          <Link href="/shop">
            کشف قهوه‌ها <ArrowLeft />
          </Link>
        </Button>
      </div>
    )
  return (
    <div className="cart-layout">
      <div>
        <div className="cart-table-heading">
          <span>قهوه‌های انتخابی</span>
          <span>{formatNumber(count)} بسته</span>
        </div>
        {lines.map(({ product, variant, quantity }) => (
          <article className="cart-row" key={variant.id}>
            <Link href={`/shop/${product.slug}`} className="cart-product-image">
              <ProductVisual name={product.name} />
            </Link>
            <div className="cart-product-copy">
              <Link href={`/shop/${product.slug}`}>
                <h2>{product.name}</h2>
              </Link>
              <p>{variant.label}</p>
              <span>{variant.price === null ? 'قیمت به‌زودی' : formatPrice(variant.price)}</span>
              <div className="quantity-control">
                <button
                  aria-label={`افزایش تعداد ${product.name} ${variant.label}`}
                  disabled={quantity >= maxCartQuantity}
                  onClick={() => setQuantity(variant.id, quantity + 1)}
                >
                  <Plus size={15} />
                </button>
                <output>{formatNumber(quantity)}</output>
                <button
                  aria-label={`کاهش تعداد ${product.name} ${variant.label}`}
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(variant.id, quantity - 1)}
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>
            <div className="cart-row-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`حذف ${product.name} ${variant.label}`}
                onClick={() => setQuantity(variant.id, 0)}
              >
                <Trash2 />
              </Button>
              <strong>{variant.price === null ? 'قیمت به‌زودی' : formatPrice(variant.price * quantity)}</strong>
            </div>
          </article>
        ))}
        <Link className="quiet-link continue-shopping" href="/shop">
          ادامهٔ انتخاب قهوه <ArrowLeft size={17} />
        </Link>
      </div>
      <aside className="order-summary">
        <span className="eyebrow">خلاصهٔ سبد</span>
        <h2>برای فنجان‌های پیش رو</h2>
        <dl>
          <div>
            <dt>جمع کالاها ({formatNumber(count)} بسته)</dt>
            <dd>{awaitingPrices ? 'پس از اعلام قیمت' : formatPrice(subtotal)}</dd>
          </div>
          <div>
            <dt>هزینهٔ ارسال</dt>
            <dd>در مرحلهٔ بعد</dd>
          </div>
          <div className="summary-total">
            <dt>جمع سبد</dt>
            <dd>{awaitingPrices ? 'پس از اعلام قیمت' : formatPrice(subtotal)}</dd>
          </div>
        </dl>
        {awaitingPrices ? <Button className="w-full" size="lg" disabled>در انتظار اعلام قیمت</Button> : <Button className="w-full" size="lg" asChild>
          <Link href="/checkout/address">ادامهٔ خرید <ArrowLeft /></Link>
        </Button>}
        <p>
          در قدم بعد، آدرس ارسال را ثبت می‌کنی و سفارش را بررسی می‌کنی.
        </p>
      </aside>
    </div>
  )
}
