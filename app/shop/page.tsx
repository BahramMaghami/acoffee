import type { Metadata } from 'next'
import { ShopCatalog } from './shop-catalog'

export const metadata: Metadata = { title: 'قهوه‌های ما' }
export default function ShopPage() {
  return (
    <div className="shell page-space">
      <div className="page-heading">
        <div>
          <span className="eyebrow">مجموعهٔ آ</span>
          <h1>قهوه‌های آ</h1>
          <p>محصولات را بر اساس دسته‌بندی ببین و انتخاب کن.</p>
        </div>
        <span className="heading-index" aria-hidden="true">
          01 / COFFEE
        </span>
      </div>
      <ShopCatalog />
    </div>
  )
}
