'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/app/cart/cart-store'
import { formatNumber, formatPrice, productVariant, roastOptions, maxCartQuantity, type StoreProduct, type Roast, type Grade } from '@/lib/storefront'

export function ProductPurchase({ product }: { product: StoreProduct }) {
  const [quantity, setQuantity] = useState(1)
  const [weight, setWeight] = useState(product.weights.includes(250) ? 250 : product.weights[0])
  const [roast, setRoast] = useState<Roast | undefined>(product.roasts[0])
  const [grade, setGrade] = useState<Grade>('standard')
  const router = useRouter()
  const { items, add } = useCart()
  const variant = productVariant(product, weight, roast, grade)!
  const inCart = items.find((item) => item.productId === variant.id)?.quantity ?? 0
  const remaining = maxCartQuantity - inCart
  const selected = Math.min(quantity, Math.max(remaining, 1))
  return <div className="product-purchase">
    <div className="purchase-options">
      <fieldset><legend>وزن بسته</legend><div className="option-buttons">{product.weights.map((value) =>
        <button key={value} type="button" aria-pressed={weight === value} onClick={() => setWeight(value)}>{formatNumber(value)} گرم</button>)}</div></fieldset>
      {product.roasts.length > 0 && <fieldset><legend>درجهٔ رست</legend><div className="option-buttons">{roastOptions.filter((option) => product.roasts.includes(option.value)).map((option) =>
        <button key={option.value} type="button" aria-pressed={roast === option.value} onClick={() => setRoast(option.value)}>{option.label}</button>)}</div></fieldset>}
      {product.grades.length > 1 && <fieldset><legend>نوع قهوه</legend><div className="option-buttons">{product.grades.map((value) =>
        <button key={value} type="button" aria-pressed={grade === value} onClick={() => setGrade(value)}>{value === 'vip' ? 'VIP' : 'معمولی'}</button>)}</div></fieldset>}
    </div>
    <div className="purchase-price"><div><span className="eyebrow">{variant.label}</span><strong>{variant.price === null ? 'قیمت به‌زودی' : formatPrice(variant.price)}</strong></div></div>
    <div className="purchase-actions">
      <div className="quantity-control">
        <button aria-label="افزایش تعداد" disabled={selected >= remaining} onClick={() => setQuantity(selected + 1)}><Plus size={16} /></button>
        <output aria-label="تعداد انتخاب‌شده">{formatNumber(selected)}</output>
        <button aria-label="کاهش تعداد" disabled={selected <= 1} onClick={() => setQuantity(selected - 1)}><Minus size={16} /></button>
      </div>
      <Button size="lg" disabled={remaining <= 0} onClick={() => {
        add(variant.id, selected)
        toast.success('به سبدت اضافه شد.', {
          id: 'cart-' + variant.id, description: product.name + ' · ' + variant.label,
          action: { label: 'برو به سبد خرید', onClick: () => router.push('/cart') },
        })
      }}><ShoppingBag />افزودن به سبد خرید</Button>
    </div>
    {variant.price === null && <p className="product-reassurance">می‌توانی انتخابت را در سبد نگه داری؛ ثبت سفارش پس از اعلام قیمت فعال می‌شود.</p>}
  </div>
}
