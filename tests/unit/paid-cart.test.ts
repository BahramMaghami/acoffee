import assert from 'node:assert/strict'
import test from 'node:test'
import { removePaidLines } from '../../lib/paid-cart'
import type { BrowserCartItem } from '../../lib/cart-lines'

const line: BrowserCartItem = { productId: 'coffee', quantity: 2, grind: 'WHOLE_BEAN', grindDevice: null }
test('paid cart removes purchased units but preserves added units and other preparations', () => {
  const extra: BrowserCartItem = { ...line, grind: 'GROUND', grindDevice: 'MOKA_POT' }
  assert.deepEqual(removePaidLines([line], [line], [line]), [])
  assert.deepEqual(removePaidLines([{ ...line, quantity: 3 }, extra], [line], [line]), [{ ...line, quantity: 1 }, extra])
  assert.deepEqual(removePaidLines([line], [], [line]), [line])
  assert.deepEqual(removePaidLines([line], [line], [{ ...line, quantity: 1 }]), [line])
})

test('browser receipt cleanup is idempotent across repeated successful page visits', async () => {
  const data = new Map<string, string>()
  const target = new EventTarget()
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target })
  try {
    const { rememberOrderCart, consumePaidCart } = await import('../../app/cart/cart-store')
    data.set('acoffee:preview-cart:v1', JSON.stringify([line]))
    rememberOrderCart('order', [line])
    await consumePaidCart('order', [line])
    assert.deepEqual(JSON.parse(data.get('acoffee:preview-cart:v1')!), [])
    data.set('acoffee:preview-cart:v1', JSON.stringify([line]))
    rememberOrderCart('order', [line])
    await consumePaidCart('order', [line])
    assert.deepEqual(JSON.parse(data.get('acoffee:preview-cart:v1')!), [line])
    await consumePaidCart('old-order-without-receipt', [line])
    assert.deepEqual(JSON.parse(data.get('acoffee:preview-cart:v1')!), [line])
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
