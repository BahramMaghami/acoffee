'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { products, formatPrice, formatNumber } from '@/lib/storefront'
import { useCart } from './cart-store'

export function CartContent() {
  const { items, count, setQuantity } = useCart()
  const lines = items.flatMap((item) => {
    const product = products.find((product) => product.id === item.productId)
    return product ? [{ product, quantity: item.quantity }] : []
  })
  const subtotal = lines.reduce(
    (total, { product, quantity }) => total + product.price * quantity,
    0,
  )
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
        {lines.map(({ product, quantity }) => (
          <article className="cart-row" key={product.id}>
            <Link href={`/shop/${product.slug}`} className="cart-product-image">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="120px"
              />
            </Link>
            <div className="cart-product-copy">
              <Link href={`/shop/${product.slug}`}>
                <h2>{product.name}</h2>
              </Link>
              <p>۲۵۰ گرم · {product.roast}</p>
              <span>{formatPrice(product.price)}</span>
              <div className="quantity-control">
                <button
                  aria-label={`افزایش تعداد ${product.name}`}
                  disabled={quantity >= product.stock}
                  onClick={() => setQuantity(product.id, quantity + 1)}
                >
                  <Plus size={15} />
                </button>
                <output>{formatNumber(quantity)}</output>
                <button
                  aria-label={`کاهش تعداد ${product.name}`}
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(product.id, quantity - 1)}
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>
            <div className="cart-row-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`حذف ${product.name}`}
                onClick={() => setQuantity(product.id, 0)}
              >
                <Trash2 />
              </Button>
              <strong>{formatPrice(product.price * quantity)}</strong>
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
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div>
            <dt>هزینهٔ ارسال</dt>
            <dd>در مرحلهٔ بعد</dd>
          </div>
          <div className="summary-total">
            <dt>جمع سبد</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <Button className="w-full" size="lg" asChild>
          <Link href="/checkout/address">ادامهٔ خرید <ArrowLeft /></Link>
        </Button>
        <p>
          در قدم بعد، آدرس ارسال را ثبت می‌کنی و سفارش را بررسی می‌کنی.
        </p>
      </aside>
    </div>
  )
}
