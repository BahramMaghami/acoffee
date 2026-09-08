import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addressSchema, cartInputSchema, placeOrderSchema } from '../../lib/validators/checkout'
import { safeAuthRedirect } from '../../lib/auth-redirect'

const address = { province: ' تهران ', city: 'تهران', addressLine: 'خیابان آزمایشی، پلاک ۱۲', postalCode: '۱۲۳۴۵۶۷۸۹۰', phone: '٠٩١٢١٢٣٤٥٦٧' }
test('shipping normalizes Persian and Arabic digits without losing leading zeros', () => {
  const parsed = addressSchema.parse({ ...address, userId: 'someone-else', recipientName: 'injected' })
  assert.equal(parsed.province, 'تهران')
  assert.equal(parsed.postalCode, '1234567890')
  assert.equal(parsed.phone, '09121234567')
  assert.equal('userId' in parsed, false)
  assert.equal('recipientName' in parsed, false)
  assert.equal(addressSchema.safeParse({ ...address, postalCode: '123' }).success, false)
  assert.equal(addressSchema.safeParse({ ...address, phone: '12345678901' }).success, false)
})
test('checkout rejects empty, duplicate, fractional and oversized carts', () => {
  for (const input of [[], [{ productId: 'daily-blend', quantity: 0 }], [{ productId: 'daily-blend', quantity: 1.5 }],
    [{ productId: 'daily-blend', quantity: 101 }], [{ productId: 'daily-blend', quantity: 1 }, { productId: 'daily-blend', quantity: 2 }]])
    assert.equal(cartInputSchema.safeParse(input).success, false)
  assert.deepEqual(cartInputSchema.parse([{ productId: 'daily-blend', quantity: 2, price: 1 }]), [{ productId: 'daily-blend', quantity: 2 }])
  assert.equal(placeOrderSchema.safeParse({ checkoutKey: 'invalid', quoteHash: 'fake' }).success, false)
})
test('login preserves only recognized checkout and order destinations', () => {
  assert.equal(safeAuthRedirect('/checkout/address'), '/checkout/address')
  assert.equal(safeAuthRedirect('/checkout/place-order'), '/checkout/place-order')
  assert.equal(safeAuthRedirect('/orders/cm123'), '/orders/cm123')
  assert.equal(safeAuthRedirect('/orders/../api/auth'), '/account')
})
