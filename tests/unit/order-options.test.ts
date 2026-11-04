import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCart } from '../../lib/cart-lines'
import { cartInputSchema, placeOrderSchema } from '../../lib/validators/checkout'
import { grindLabel, shippingLabel } from '../../lib/order-options'

test('cart preserves legacy choices as unselected, separates grind lines and merges only identical selections', () => {
  const lines = parseCart(JSON.stringify([
    { productId: 'coffee', quantity: 2 }, { productId: 'coffee', quantity: 3, grind: 'GROUND' },
    { productId: 'coffee', quantity: 1, grind: 'WHOLE_BEAN' }, { productId: 'coffee', quantity: 2, grind: 'GROUND' },
  ]))
  assert.deepEqual(lines, [{ productId: 'coffee', quantity: 2, grind: null }, { productId: 'coffee', quantity: 5, grind: 'GROUND' }, { productId: 'coffee', quantity: 1, grind: 'WHOLE_BEAN' }])
  assert.equal(cartInputSchema.safeParse(lines).success, false)
  assert.equal(cartInputSchema.safeParse(lines.slice(1)).success, true)
  assert.equal(cartInputSchema.safeParse([lines[1], lines[1]]).success, false)
  assert.equal(cartInputSchema.safeParse([{ productId: 'coffee', quantity: 1, grind: 'injected' }]).success, false)
})

test('delivery is mandatory, restricted to supported options, and legacy orders never receive an invented label', () => {
  const order = { checkoutKey: 'b9ec07be-a73b-47d8-b230-7247827c0d28', quoteHash: 'a'.repeat(64) }
  for (const shippingMethod of [undefined, '', 'express', null]) assert.equal(placeOrderSchema.safeParse({ ...order, shippingMethod }).success, false)
  for (const shippingMethod of ['POST', 'TIPAX', 'COURIER', 'PICKUP']) assert.equal(placeOrderSchema.parse({ ...order, shippingMethod }).shippingMethod, shippingMethod)
  assert.match(grindLabel(null), /ثبت نشده/)
  assert.match(shippingLabel(null), /ثبت نشده/)
})
