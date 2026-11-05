import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCart } from '../../lib/cart-lines'
import { cartInputSchema, placeOrderSchema } from '../../lib/validators/checkout'
import { grindLabel, shippingLabel, preparationLabel } from '../../lib/order-options'

test('cart preserves legacy choices as unselected, separates grind lines and merges only identical selections', () => {
  const lines = parseCart(JSON.stringify([
    { productId: 'coffee', quantity: 2 }, { productId: 'coffee', quantity: 3, grind: 'GROUND' },
    { productId: 'coffee', quantity: 1, grind: 'WHOLE_BEAN' }, { productId: 'coffee', quantity: 2, grind: 'GROUND' },
  ]))
  assert.deepEqual(lines, [{ productId: 'coffee', quantity: 2, grind: null, grindDevice: null }, { productId: 'coffee', quantity: 5, grind: 'GROUND', grindDevice: null }, { productId: 'coffee', quantity: 1, grind: 'WHOLE_BEAN', grindDevice: null }])
  assert.equal(cartInputSchema.safeParse(lines).success, false)
  assert.equal(cartInputSchema.safeParse(lines.slice(1)).success, false)
  assert.equal(cartInputSchema.safeParse(lines.slice(2)).success, true)
  assert.equal(cartInputSchema.safeParse([lines[1], lines[1]]).success, false)
  assert.equal(cartInputSchema.safeParse([{ productId: 'coffee', quantity: 1, grind: 'injected' }]).success, false)
})

test('devices separate identical SKUs, merge exact selections and retain legacy ground carts for correction', () => {
  const item = { productId: 'coffee', quantity: 2, grind: 'GROUND' }
  const lines = parseCart(JSON.stringify([
    { ...item, grindDevice: 'MOKA_POT' }, { ...item, grindDevice: 'HOME_ESPRESSO' },
    { ...item, grindDevice: 'MOKA_POT' }, item,
  ]))
  assert.equal(lines.length, 3)
  assert.deepEqual(lines.map(({ quantity, grindDevice }) => ({ quantity, grindDevice })), [
    { quantity: 4, grindDevice: 'MOKA_POT' }, { quantity: 2, grindDevice: 'HOME_ESPRESSO' }, { quantity: 2, grindDevice: null },
  ])
  assert.equal(cartInputSchema.safeParse(lines.slice(0, 2)).success, true)
  assert.equal(cartInputSchema.safeParse([lines[0], lines[0]]).success, false)
  for (const grindDevice of [null, undefined, '', 'FAKE']) assert.equal(cartInputSchema.safeParse([{ ...item, grindDevice }]).success, false)
  for (const grindDevice of ['MOKA_POT', 'HOME_ESPRESSO', 'SEMI_COMMERCIAL', 'COMMERCIAL']) {
    assert.equal(cartInputSchema.safeParse([{ ...item, grindDevice }]).success, true)
    assert.equal(cartInputSchema.safeParse([{ ...item, grind: 'WHOLE_BEAN', grindDevice }]).success, false)
  }
  assert.equal(parseCart(JSON.stringify([{ ...item, grind: 'WHOLE_BEAN', grindDevice: 'MOKA_POT' }]))[0].grindDevice, null)
  assert.match(preparationLabel('GROUND', null), /دستگاه ثبت نشده/)
  assert.match(preparationLabel('GROUND', 'MOKA_POT'), /موکاپات/)
  assert.doesNotMatch(preparationLabel('WHOLE_BEAN', null), /دستگاه/)
})

test('delivery is mandatory, restricted to supported options, and legacy orders never receive an invented label', () => {
  const order = { checkoutKey: 'b9ec07be-a73b-47d8-b230-7247827c0d28', quoteHash: 'a'.repeat(64) }
  for (const shippingMethod of [undefined, '', 'express', null, 'PICKUP']) assert.equal(placeOrderSchema.safeParse({ ...order, shippingMethod }).success, false)
  for (const shippingMethod of ['POST', 'TIPAX', 'COURIER']) assert.equal(placeOrderSchema.parse({ ...order, shippingMethod }).shippingMethod, shippingMethod)
  assert.equal(shippingLabel('PICKUP'), 'تحویل حضوری')
  assert.match(grindLabel(null), /ثبت نشده/)
  assert.match(shippingLabel(null), /ثبت نشده/)
})
