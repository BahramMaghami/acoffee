'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { grindOptions, grindLabel, type GrindOption } from '@/lib/order-options'
import { useCart } from '@/app/cart/cart-store'
import { formatNumber, formatWeight, formatPrice, productVariant, roastOptions, gradeLabels, maxCartQuantity, type StoreProduct, type Roast, type Grade } from '@/lib/storefront'

export function ProductPurchase({ product, initialWeight }: { product: StoreProduct; initialWeight: number }) {
  const [quantity, setQuantity] = useState(1)
  const [weight, setWeight] = useState(initialWeight)
  const [roast, setRoast] = useState<Roast | undefined>(product.roasts[0])
  const [grade, setGrade] = useState<Grade>(product.grades[0])
  const [grind, setGrind] = useState<GrindOption | null>(null)
  const router = useRouter()
  const { items, add } = useCart()
  const variant = productVariant(product, weight, roast, grade)!
  const validGrind = grind !== null && variant.grindOptions.includes(grind)
  const inCart = items.find((item) => item.productId === variant.id && item.grind === grind)?.quantity ?? 0
  const remaining = maxCartQuantity - inCart
  const selected = Math.min(quantity, Math.max(remaining, 1))
  return <div className="product-purchase" data-weight={weight} data-discount={variant.isActive ? variant.discountPercent : 0}>
    <div className="purchase-options">
      <fieldset><legend>وزن بسته</legend><div className="option-buttons">{product.weights.map((value) =>
        <button key={value} type="button" aria-pressed={weight === value} onClick={() => setWeight(value)}>{formatWeight(value)}</button>)}</div></fieldset>
      <fieldset><legend>قهوه را چطور آماده کنیم؟</legend><div className="option-buttons">{grindOptions.filter(option => variant.grindOptions.includes(option.value)).map(option =>
        <button key={option.value} type="button" aria-pressed={grind === option.value} onClick={() => setGrind(option.value)}>{option.label}</button>)}</div>
        {!validGrind && <p className="product-reassurance">آسیاب‌شده یا دانهٔ کامل را انتخاب کن.</p>}
      </fieldset>
      {product.roasts.length > 0 && <fieldset><legend>درجهٔ رست</legend><div className="option-buttons">{roastOptions.filter((option) => product.roasts.includes(option.value)).map((option) =>
        <button key={option.value} type="button" aria-pressed={roast === option.value} onClick={() => setRoast(option.value)}>{option.label}</button>)}</div></fieldset>}
      {product.grades.length > 1 && <fieldset><legend>نوع قهوه</legend><div className="option-buttons">{product.grades.map((value) =>
        <button key={value} type="button" dir="ltr" aria-pressed={grade === value} onClick={() => setGrade(value)}>{gradeLabels[value]}</button>)}</div></fieldset>}
    </div>
    <div className="purchase-price"><div><span className="eyebrow">{variant.label}</span><strong>{variant.price === null ? 'قیمت به‌زودی' : formatPrice(variant.price)}</strong></div></div>
    <div className="purchase-actions">
      <div className="quantity-control">
        <button aria-label="افزایش تعداد" disabled={selected >= remaining} onClick={() => setQuantity(selected + 1)}><Plus size={16} /></button>
        <output aria-label="تعداد انتخاب‌شده">{formatNumber(selected)}</output>
        <button aria-label="کاهش تعداد" disabled={selected <= 1} onClick={() => setQuantity(selected - 1)}><Minus size={16} /></button>
      </div>
      <Button size="lg" disabled={remaining <= 0 || !variant.isActive || !validGrind} onClick={() => {
        if (!grind || !validGrind) return
        add(variant.id, selected, grind)
        toast.success('به سبدت اضافه شد.', {
          id: 'cart-' + variant.id + '-' + grind, description: product.name + ' · ' + variant.label + ' · ' + grindLabel(grind),
          action: { label: 'برو به سبد خرید', onClick: () => router.push('/cart') },
        })
      }}><ShoppingBag />افزودن به سبد خرید</Button>
    </div>
    {!variant.isActive && <p className="product-reassurance">این انتخاب فعلاً قابل سفارش نیست.</p>}
    {variant.price === null && <p className="product-reassurance">می‌توانی انتخابت را در سبد نگه داری؛ ثبت سفارش پس از اعلام قیمت فعال می‌شود.</p>}
  </div>
}
