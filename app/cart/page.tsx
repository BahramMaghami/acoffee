import type { Metadata } from 'next'
import { CartContent } from './cart-content'

export const metadata: Metadata = { title: 'سبد خرید' }
export default function CartPage() {
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
      <CartContent />
    </div>
  )
}
