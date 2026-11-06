import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { checkoutQuote, lastShippingMethod } from '../../lib/checkout'

function fixture() {
  const product = { id: 'sku', slug: 'coffee', name: 'قهوه', weightGrams: 500, price: 1000, isActive: true, catalogProduct: { isActive: true }, grindOptions: ['WHOLE_BEAN', 'GROUND'] }
  const items = [{ id: 'ground', product, quantity: 2, grind: 'GROUND', grindDevice: 'MOKA_POT' as string | null }, { id: 'whole', product, quantity: 1, grind: 'WHOLE_BEAN', grindDevice: null as string | null }]
  const cart = { checkoutKey: 'b9ec07be-a73b-47d8-b230-7247827c0d28', items }
  const address = { recipientName: 'تست', province: 'تهران', city: 'تهران', addressLine: 'نشانی آزمایشی پلاک ۱', postalCode: '1234567890', phone: '09121234567' }
  return { cart, address, product, db: { user: { findUnique: async () => ({ phone: '09121234567', phoneVerifiedAt: new Date() }) }, cart: { findUnique: async () => cart }, address: { findFirst: async () => address } } }
}

test('quotes snapshot both grinds, detect changes, and reject unavailable or legacy choices', async () => {
  const f = fixture(), db = f.db as unknown as Parameters<typeof checkoutQuote>[1]
  const quote = await checkoutQuote('owner', db)
  assert.deepEqual(quote.items.map(item => item.grind), ['GROUND', 'WHOLE_BEAN'])
  assert.deepEqual(quote.items.map(item => item.grindDevice), ['MOKA_POT', null])
  assert.equal(quote.total, 3000)
  f.cart.items[0].grindDevice = 'HOME_ESPRESSO'
  assert.notEqual((await checkoutQuote('owner', db)).quoteHash, quote.quoteHash)
  assert.equal((await checkoutQuote('owner', db)).total, quote.total)
  f.cart.items[0].grindDevice = null
  await assert.rejects(checkoutQuote('owner', db), /دستگاه/)
  f.cart.items[0].grind = 'WHOLE_BEAN'
  assert.notEqual((await checkoutQuote('owner', db)).quoteHash, quote.quoteHash)
  f.cart.items[0].grindDevice = 'MOKA_POT'
  await assert.rejects(checkoutQuote('owner', db), /دستگاه/)
  f.cart.items[0].grind = ''
  await assert.rejects(checkoutQuote('owner', db), /آسیاب/)
  f.cart.items[0].grind = 'GROUND'; f.product.grindOptions = ['WHOLE_BEAN']
  await assert.rejects(checkoutQuote('owner', db), /آسیاب/)
})

test('previous delivery lookup is scoped to the current user and first order stays empty', async () => {
  let result: { shippingMethod: 'TIPAX' | 'PICKUP' } | null = null
  const db = { order: { findFirst: async (input: unknown) => {
    assert.deepEqual(input, { where: { userId: 'owner', shippingMethod: { not: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { shippingMethod: true } })
    return result
  } } } as unknown as Parameters<typeof lastShippingMethod>[1]
  assert.equal(await lastShippingMethod('owner', db), null)
  result = { shippingMethod: 'TIPAX' }
  assert.equal(await lastShippingMethod('owner', db), 'TIPAX')
  result = { shippingMethod: 'PICKUP' }
  assert.equal(await lastShippingMethod('owner', db), null)
})

test('cart action persists distinct devices and rejects incomplete or forged preparation before writing', async () => {
  const f = fixture()
  let writes = 0
  let inserted: unknown[] = []
  const db = {
    $queryRaw: async () => [],
    product: { findMany: async () => [f.product] },
    cart: { upsert: async ({ where }: { where: { userId: string } }) => { assert.equal(where.userId, 'owner'); return { id: 'owned-cart' } } },
    cartItem: { deleteMany: async () => { writes++ }, createMany: async ({ data }: { data: unknown[] }) => { inserted = data } },
  }
  const state = { user: { id: 'owner' } as { id: string } | null, db: { ...db, $transaction: async (callback: (tx: typeof db) => unknown) => callback(db) } }
  const bundle = await build({ entryPoints: ['actions/cart.actions.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'], plugins: [{ name: 'cart-boundaries', setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/(current-user|db|auth-error)$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, args => args.importer.endsWith('checkout.ts') ? { path: 'db', namespace: 'stub' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser=async()=>state.user;' }
      if (args.path.endsWith('auth-error')) return { contents: 'export const logAuthError=()=>{};' }
      return { contents: 'export const getDb=()=>state.db;' }
    })
  } }] })
  const mod = { exports: {} as { saveCheckoutCartAction: (input: unknown) => Promise<{ success: boolean }> } }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  const save = mod.exports.saveCheckoutCartAction
  const item = { productId: 'coffee', quantity: 1, grind: 'GROUND', grindDevice: 'MOKA_POT' }
  state.user = null; assert.equal((await save([item])).success, false)
  state.user = { id: 'owner' }
  for (const invalid of [{ ...item, grindDevice: null }, { ...item, grindDevice: 'FAKE' }, { ...item, grind: 'WHOLE_BEAN' }])
    assert.equal((await save([invalid])).success, false)
  assert.equal(writes, 0)
  assert.equal((await save([item, { ...item, grindDevice: 'HOME_ESPRESSO', quantity: 2 }])).success, true)
  assert.deepEqual(inserted, [
    { cartId: 'owned-cart', productId: 'sku', quantity: 1, grind: 'GROUND', grindDevice: 'MOKA_POT' },
    { cartId: 'owned-cart', productId: 'sku', quantity: 2, grind: 'GROUND', grindDevice: 'HOME_ESPRESSO' },
  ])
  f.product.grindOptions = ['WHOLE_BEAN']
  assert.equal((await save([item])).success, false)
  assert.equal(writes, 1)
})

test('order action validates delivery, saves immutable snapshots and preserves idempotency and ownership', async () => {
  const f = fixture()
  type Stored = { id: string; userId: string; shippingMethod: string; items: { create: { grind: string; grindDevice: string | null }[] }; addressLine: string }
  let saved: Stored | null = null, creates = 0
  const db = { ...f.db, $queryRaw: async () => [],
    order: { findUnique: async () => saved, create: async ({ data }: { data: Omit<Stored, 'id'> }) => {
      creates++; saved = structuredClone({ ...data, id: 'saved-order' }); return { id: saved.id }
    } },
  }
  const state = { user: { id: 'owner' } as { id: string } | null, db: { ...db, $transaction: async (callback: (tx: typeof db) => unknown) => callback(db) } }
  const bundle = await build({ entryPoints: ['actions/order.actions.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'], plugins: [{ name: 'order-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|db|auth-error))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, args => args.importer.endsWith('checkout.ts') ? { path: 'db', namespace: 'stub' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path === 'next/cache') return { contents: 'export const revalidatePath=()=>{}' }
      if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser=async()=>state.user; export const requireAdmin=async()=>state.user;' }
      if (args.path.endsWith('auth-error')) return { contents: 'export const logAuthError=()=>{};' }
      return { contents: 'export const getDb=()=>state.db;' }
    })
  } }] })
  const mod = { exports: {} as { placeOrderAction: (input: unknown) => Promise<{ success: boolean; orderId?: string }> } }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  const place = mod.exports.placeOrderAction
  const quote = await checkoutQuote('owner', f.db as unknown as Parameters<typeof checkoutQuote>[1])
  const input = { checkoutKey: quote.checkoutKey, quoteHash: quote.quoteHash, shippingMethod: 'TIPAX', userId: 'victim', total: 1 }
  state.user = null; assert.equal((await place(input)).success, false)
  state.user = { id: 'owner' }
  assert.equal((await place({ ...input, shippingMethod: '' })).success, false)
  assert.equal((await place({ ...input, shippingMethod: 'PICKUP' })).success, false)
  f.cart.items[0].grindDevice = 'HOME_ESPRESSO'
  assert.equal((await place(input)).success, false)
  f.cart.items[0].grindDevice = null
  assert.equal((await place(input)).success, false)
  assert.equal(creates, 0)
  f.cart.items[0].grindDevice = 'MOKA_POT'
  assert.equal((await place(input)).success, true)
  const order = saved! as Stored
  assert.equal(order.userId, 'owner'); assert.equal(order.shippingMethod, 'TIPAX')
  assert.deepEqual(order.items.create.map(item => item.grind), ['GROUND', 'WHOLE_BEAN'])
  assert.deepEqual(order.items.create.map(item => item.grindDevice), ['MOKA_POT', null])
  f.address.addressLine = 'نشانی تغییر کرده'; f.cart.items[0].grind = 'WHOLE_BEAN'
  assert.equal((await place({ ...input, shippingMethod: 'POST' })).orderId, 'saved-order')
  assert.equal(creates, 1); assert.equal(order.shippingMethod, 'TIPAX')
  assert.equal(order.items.create[0].grindDevice, 'MOKA_POT')
  assert.equal(order.items.create[0].grind, 'GROUND'); assert.equal(order.addressLine, 'نشانی آزمایشی پلاک ۱')
  state.user = { id: 'another-user' }; assert.equal((await place(input)).success, false)
})
