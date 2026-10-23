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
          <span className="eyebrow">انتخاب‌های خوش‌عطر تو</span>
          <h1>سبد خرید</h1>
          <p>یک قدم نزدیک‌تر به فنجان بعدی.</p>
        </div>
        <span className="heading-index">YOUR NEXT CUP</span>
      </div>
      <CartContent products={products} />
    </div>
  )
}
