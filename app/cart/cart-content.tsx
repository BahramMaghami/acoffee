'use client'

import { ProductVisual } from '@/app/shop/product-visual'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { productVariants, maxCartQuantity, formatPrice, formatNumber, type StoreProduct } from '@/lib/storefront'
import { useCart } from './cart-store'
import { cartLineKey, grindLabel, preparationLabel, grindDevices, isGrindDevice, isGrindOption } from '@/lib/order-options'

export function CartContent({ products }: { products: StoreProduct[] }) {
  const { items, count, setQuantity, setPreparation } = useCart()
  const variants = new Map(products.flatMap(productVariants).map(v => [v.id, v]))
  const missing = items.filter(item => !variants.has(item.productId))
  const lines = items.flatMap((item) => {
    const variant = variants.get(item.productId)
    return variant ? [{ product: variant.product, variant, quantity: item.quantity, grind: item.grind, grindDevice: item.grindDevice }] : []
  })
  const subtotal = lines.reduce(
    (total, { variant, quantity }) => total + (variant.price ?? 0) * quantity,
    0,
  )
  const awaitingPrices = missing.length > 0 || lines.some(({ variant }) => variant.price === null || !variant.isActive)
  const awaitingGrind = lines.some(({ variant, grind }) => !grind || !variant.grindOptions.includes(grind))
  const awaitingDevice = lines.some(({ grind, grindDevice }) => grind === 'GROUND' && !grindDevice)
  if (!items.length)
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
        {missing.map(item => <div className="form-error" key={cartLineKey(item.productId, item.grind, item.grindDevice)}><p>یکی از انتخاب‌های سبد حذف یا غیرفعال شده است. برای ادامه آن را حذف کن.</p><Button variant="outline" onClick={() => setQuantity(item.productId, 0, item.grind, item.grindDevice)}>حذف انتخاب ناموجود</Button></div>)}
        <div className="cart-table-heading">
          <span>قهوه‌های انتخابی</span>
          <span>{formatNumber(count)} بسته</span>
        </div>
        {lines.map(({ product, variant, quantity, grind, grindDevice }) => (
          <article className="cart-row" key={cartLineKey(variant.id, grind, grindDevice)}>
            <Link href={`/shop/${product.slug}`} className="cart-product-image">
              <ProductVisual name={product.name} imageUrl={product.imageUrl} sizes="100px" />
            </Link>
            <div className="cart-product-copy">
              <Link href={`/shop/${product.slug}`}>
                <h2>{product.name}</h2>
              </Link>
              <p>{variant.label}</p>
              <label className="cart-grind-field">نوع آسیاب
                <select value={grind ?? ''} aria-label={`نوع آسیاب ${product.name} ${variant.label} ${preparationLabel(grind, grindDevice)}`} onChange={event => { if (isGrindOption(event.target.value)) setPreparation(variant.id, { grind, grindDevice }, event.target.value) }}>
                  <option value="" disabled>انتخاب کن</option>
                  {variant.grindOptions.map(value => <option key={value} value={value}>{grindLabel(value)}</option>)}
                </select>
              </label>
              {grind === 'GROUND' && <label className="cart-grind-field">دستگاه آسیاب
                <select value={grindDevice ?? ''} aria-invalid={!grindDevice} aria-label={`دستگاه آسیاب ${product.name} ${variant.label} ${preparationLabel(grind, grindDevice)}`} onChange={event => { if (isGrindDevice(event.target.value)) setPreparation(variant.id, { grind, grindDevice }, 'GROUND', event.target.value) }}>
                  <option value="" disabled>دستگاه را انتخاب کن</option>
                  {grindDevices.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>}
              {grind === 'GROUND' && !grindDevice && <p className="field-error">دستگاه آسیاب را برای ادامهٔ خرید انتخاب کن.</p>}
              {(!grind || !variant.grindOptions.includes(grind)) && <p className="field-error">نوع آسیاب را برای ادامهٔ خرید انتخاب کن.</p>}
              {!variant.isActive && <p className="field-error">این انتخاب فعلاً قابل سفارش نیست؛ آن را از سبد حذف کن.</p>}
              <span>{variant.price === null ? 'قیمت به‌زودی' : formatPrice(variant.price)}</span>
              <div className="quantity-control">
                <button
                  aria-label={`افزایش تعداد ${product.name} ${variant.label} ${preparationLabel(grind, grindDevice)}`}
                  disabled={quantity >= maxCartQuantity}
                  onClick={() => setQuantity(variant.id, quantity + 1, grind, grindDevice)}
                >
                  <Plus size={15} />
                </button>
                <output>{formatNumber(quantity)}</output>
                <button
                  aria-label={`کاهش تعداد ${product.name} ${variant.label} ${preparationLabel(grind, grindDevice)}`}
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(variant.id, quantity - 1, grind, grindDevice)}
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>
            <div className="cart-row-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`حذف ${product.name} ${variant.label} ${preparationLabel(grind, grindDevice)}`}
                onClick={() => setQuantity(variant.id, 0, grind, grindDevice)}
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
        {awaitingPrices ? <Button className="w-full" size="lg" disabled>در انتظار اعلام قیمت</Button> : awaitingGrind ? <Button className="w-full" size="lg" disabled>ابتدا نوع آسیاب را انتخاب کن</Button> : awaitingDevice ? <Button className="w-full" size="lg" disabled>ابتدا دستگاه آسیاب را انتخاب کن</Button> : <Button className="w-full" size="lg" asChild>
          <Link href="/checkout/address">ادامهٔ خرید <ArrowLeft /></Link>
        </Button>}
        <p>
          در قدم بعد، آدرس ارسال را ثبت می‌کنی و سفارش را بررسی می‌کنی.
        </p>
      </aside>
    </div>
  )
}
