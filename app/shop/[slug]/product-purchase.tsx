'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/app/cart/cart-store'
import { formatNumber, formatPrice, type StoreProduct } from '@/lib/storefront'

export function ProductPurchase({ product }: { product: StoreProduct }) {
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()
  const { items, add } = useCart()
  const inCart =
    items.find((item) => item.productId === product.id)?.quantity ?? 0
  const remaining = product.stock - inCart
  const selected = Math.min(quantity, Math.max(remaining, 1))
  return (
    <div className="product-purchase">
      <div className="purchase-price">
        <div>
          <span className="eyebrow">بستهٔ ۲۵۰ گرمی</span>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        <span className="stock-status">
          <span />
          {remaining > 0 ? 'موجود در مجموعه' : 'حداکثر تعداد در سبد شماست'}
        </span>
      </div>
      <div className="purchase-actions">
        <div className="quantity-control">
          <button
            aria-label="افزایش تعداد"
            disabled={selected >= remaining}
            onClick={() => {
              setQuantity(selected + 1)
            }}
          >
            <Plus size={16} />
          </button>
          <output aria-label="تعداد انتخاب‌شده">
            {formatNumber(selected)}
          </output>
          <button
            aria-label="کاهش تعداد"
            disabled={selected <= 1}
            onClick={() => {
              setQuantity(selected - 1)
            }}
          >
            <Minus size={16} />
          </button>
        </div>
        <Button
          size="lg"
          disabled={remaining <= 0}
          onClick={() => {
            add(product.id, selected)
            toast.success('به سبدت اضافه شد.', {
              id: `cart-${product.id}`,
              description: product.name,
              action: {
                label: 'برو به سبد خرید',
                onClick: () => router.push('/cart'),
              },
            })
          }}
        >
          <ShoppingBag />
          افزودن به سبد خرید
        </Button>
      </div>
    </div>
  )
}
