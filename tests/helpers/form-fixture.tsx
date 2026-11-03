import { createRoot } from 'react-dom/client'
import { ProductForm } from '../../app/admin/products/product-form'
import { ProfileForm, AccountAddressForm, ChangePasswordForm } from '../../app/account/account-forms'
import { ForgotPasswordForm } from '../../app/(auth)/forgot-password/forgot-password-form'
import { ResetPasswordForm } from '../../app/(auth)/reset-password/reset-password-form'
import { RegisterForm } from '../../app/(auth)/register/register-form'

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
  else root.render(<ResetPasswordForm token={'a'.repeat(43)} />)
}
