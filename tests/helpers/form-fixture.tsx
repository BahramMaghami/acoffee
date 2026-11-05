import { createRoot } from 'react-dom/client'
import { ProductForm } from '../../app/admin/products/product-form'
import { ProfileForm, AccountAddressForm, ChangePasswordForm } from '../../app/account/account-forms'
import { ForgotPasswordForm } from '../../app/(auth)/forgot-password/forgot-password-form'
import { ResetPasswordForm } from '../../app/(auth)/reset-password/reset-password-form'
import { RegisterForm } from '../../app/(auth)/register/register-form'
import { AccountPhoneForm } from '../../app/account/account-phone-form'
import { ProductPurchase } from '../../app/shop/[slug]/product-purchase'
import { ProductDetail } from '../../app/shop/[slug]/product-detail'
import { ProductCard } from '../../app/shop/product-card'
import { CartContent } from '../../app/cart/cart-content'
import { PlaceOrderButton } from '../../app/checkout/place-order/place-order-button'
import { SiteHeader } from '../../app/site-header'
import type { StoreProduct } from '../../lib/storefront'

const coffee: StoreProduct = { id: 'test-coffee', slug: 'test-coffee', name: 'قهوهٔ آزمون', category: 'blend', categoryLabel: 'ترکیبی', wholesale: false,
  imageUrl: null, description: '', origin: '', weights: [500], roasts: ['medium'], grades: ['standard'], prices: { '500-medium-standard': 150000 },
  skuIds: { '500-medium-standard': 'test-coffee-500' }, availability: { '500-medium-standard': true }, discounts: {}, grindOptions: { '500-medium-standard': ['WHOLE_BEAN', 'GROUND'] } }

declare global {
  interface Window {
    mountFormTest: (kind: string) => void
    formTestMode: 'success' | 'offline' | 'error'
    formTestPayload: unknown
    formTestRoute: string
  }
}
window.formTestMode = 'success'
window.mountFormTest = kind => {
  const root = createRoot(document.getElementById('form-fixture')!)
  if (kind === 'product') root.render(<ProductForm uploadEnabled categories={[{ id: 'wholesale', slug: 'wholesale', name: 'کافه‌ها', defaultWeights: [5000, 10000], defaultRoasts: ['medium', 'medium-dark'], defaultGrades: ['standard', 'vip'], wholesale: true }]} initial={{
    id: 'product-test', expectedUpdatedAt: '2026-10-26T00:00:00.000Z', categoryId: 'wholesale', newCategoryName: '', name: 'قهوهٔ آزمون', weights: [5000, 10000], roasts: ['medium', 'medium-dark'], noRoast: false,
    grades: ['standard', 'vip'], basePrices: { standard: '2000000', vip: '3000000' }, overrides: {}, availability: {}, isActive: true, imagePublicId: null, removeImage: false, confirmRemoved: false,
  }} />)
  else if (kind === 'account') root.render(<div className="account-settings"><div><ProfileForm name="بهرام" email="test@acoffee.test" /><ChangePasswordForm /></div><AccountAddressForm /></div>)
  else if (kind === 'forgot') root.render(<ForgotPasswordForm enabled />)
  else if (kind === 'signup') root.render(<RegisterForm destination="/account" />)
  else if (kind === 'phone') root.render(<AccountPhoneForm phone={null} verifiedAt={null} />)
  else if (kind === 'verified-phone') root.render(<AccountPhoneForm phone="09121234567" verifiedAt="2026-11-03T10:00:00Z" />)
  else if (kind === 'grind') root.render(<><SiteHeader user={null} /><ProductPurchase product={coffee} initialWeight={500} /><CartContent products={[coffee]} /></>)
  else if (kind === 'discount-shop') {
    const discounted: StoreProduct = { ...coffee, weights: [500, 1000], grades: ['standard', 'vip'],
      prices: { '500-medium-standard': 150000, '500-medium-vip': 150000, '1000-medium-standard': 300000, '1000-medium-vip': 400000 },
      originalPrices: { '500-medium-vip': 200000 }, discounts: { '500-medium-vip': 25 },
      skuIds: { '500-medium-standard': 's1', '500-medium-vip': 's2', '1000-medium-standard': 's3', '1000-medium-vip': 's4' },
      availability: { '500-medium-standard': true, '500-medium-vip': true, '1000-medium-standard': true, '1000-medium-vip': true } }
    root.render(<><div className="product-grid"><ProductCard product={discounted} /></div><ProductDetail product={discounted} initialSelection={{ weight: 500, roast: 'medium', grade: 'vip' }}><h1>{discounted.name}</h1></ProductDetail></>)
  }
  else if (kind === 'delivery' || kind === 'return-delivery') root.render(<aside className="order-summary"><PlaceOrderButton checkoutKey="b9ec07be-a73b-47d8-b230-7247827c0d28" quoteHash={'a'.repeat(64)} initialShippingMethod={kind === 'return-delivery' ? 'TIPAX' : null} /></aside>)
  else root.render(<ResetPasswordForm token={'a'.repeat(43)} />)
}
