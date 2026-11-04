import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { checkoutQuote, lastShippingMethod } from '../../lib/checkout'

function fixture() {
  const product = { id: 'sku', slug: 'coffee', name: 'قهوه', weightGrams: 500, price: 1000, isActive: true, catalogProduct: { isActive: true }, grindOptions: ['WHOLE_BEAN', 'GROUND'] }
  const items = [{ id: 'ground', product, quantity: 2, grind: 'GROUND' }, { id: 'whole', product, quantity: 1, grind: 'WHOLE_BEAN' }]
  const cart = { checkoutKey: 'b9ec07be-a73b-47d8-b230-7247827c0d28', items }
  const address = { recipientName: 'تست', province: 'تهران', city: 'تهران', addressLine: 'نشانی آزمایشی پلاک ۱', postalCode: '1234567890', phone: '09121234567' }
  return { cart, address, product, db: { cart: { findUnique: async () => cart }, address: { findFirst: async () => address } } }
}

test('quotes snapshot both grinds, detect changes, and reject unavailable or legacy choices', async () => {
  const f = fixture(), db = f.db as unknown as Parameters<typeof checkoutQuote>[1]
  const quote = await checkoutQuote('owner', db)
  assert.deepEqual(quote.items.map(item => item.grind), ['GROUND', 'WHOLE_BEAN'])
  assert.equal(quote.total, 3000)
  f.cart.items[0].grind = 'WHOLE_BEAN'
  assert.notEqual((await checkoutQuote('owner', db)).quoteHash, quote.quoteHash)
  f.cart.items[0].grind = ''
  await assert.rejects(checkoutQuote('owner', db), /آسیاب/)
  f.cart.items[0].grind = 'GROUND'; f.product.grindOptions = ['WHOLE_BEAN']
  await assert.rejects(checkoutQuote('owner', db), /آسیاب/)
})

test('previous delivery lookup is scoped to the current user and first order stays empty', async () => {
  let result: { shippingMethod: 'TIPAX' } | null = null
  const db = { order: { findFirst: async (input: unknown) => {
    assert.deepEqual(input, { where: { userId: 'owner', shippingMethod: { not: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { shippingMethod: true } })
    return result
  } } } as unknown as Parameters<typeof lastShippingMethod>[1]
  assert.equal(await lastShippingMethod('owner', db), null)
  result = { shippingMethod: 'TIPAX' }
  assert.equal(await lastShippingMethod('owner', db), 'TIPAX')
})

test('order action validates delivery, saves immutable snapshots and preserves idempotency and ownership', async () => {
  const f = fixture()
  type Stored = { id: string; userId: string; shippingMethod: string; items: { create: { grind: string }[] }; addressLine: string }
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
  f.cart.items[0].grind = 'WHOLE_BEAN'
  assert.equal((await place(input)).success, false)
  f.cart.items[0].grind = 'GROUND'
  assert.equal((await place(input)).success, true)
  const order = saved! as Stored
  assert.equal(order.userId, 'owner'); assert.equal(order.shippingMethod, 'TIPAX')
  assert.deepEqual(order.items.create.map(item => item.grind), ['GROUND', 'WHOLE_BEAN'])
  f.address.addressLine = 'نشانی تغییر کرده'; f.cart.items[0].grind = 'WHOLE_BEAN'
  assert.equal((await place({ ...input, shippingMethod: 'POST' })).orderId, 'saved-order')
  assert.equal(creates, 1); assert.equal(order.shippingMethod, 'TIPAX')
  assert.equal(order.items.create[0].grind, 'GROUND'); assert.equal(order.addressLine, 'نشانی آزمایشی پلاک ۱')
  state.user = { id: 'another-user' }; assert.equal((await place(input)).success, false)
})
