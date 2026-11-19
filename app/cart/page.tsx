import type { Metadata } from 'next'
import { CartContent } from './cart-content'
import { getStoreCatalog } from '@/lib/catalog'

export const metadata: Metadata = { title: 'سبد خرید' }
export default async function CartPage() {
  const { products } = await getStoreCatalog()
  return (
    <div className="shell page-space">
      <div className="page-heading">
        <div>
          <span className="eyebrow">سفارش شما</span>
          <h1>سبد خرید</h1>
          <p>اقلام و تعداد بسته‌ها را پیش از ادامه بررسی کن.</p>
        </div>
        <span className="heading-index">SHOPPING CART</span>
      </div>
      <CartContent products={products} />
    </div>
  )
}
