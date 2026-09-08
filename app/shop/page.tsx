import type { Metadata } from 'next'
import { ShopCatalog } from './shop-catalog'

export const metadata: Metadata = { title: 'قهوه‌های ما' }
export default function ShopPage() {
  return (
    <div className="shell page-space">
      <div className="page-heading">
        <div>
          <span className="eyebrow">مجموعهٔ آ</span>
          <h1>هر سلیقه، یک فنجان.</h1>
          <p>از طعم‌های روشن و میوه‌ای تا ترکیب‌های عمیق و شکلاتی.</p>
        </div>
        <span className="heading-index" aria-hidden="true">
          01 / COFFEE
        </span>
      </div>
      <ShopCatalog />
    </div>
  )
}
