import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { checkoutQuote } from '../../lib/checkout'
import { generateDiscountCode, discountConsumptionStage } from '../../lib/discount-codes'

async function actions(path: string, state: unknown) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'], plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|db|auth-error))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, args => args.importer.endsWith('checkout.ts') ? { path: 'db', namespace: 'stub' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path === 'next/cache') return { contents: 'export const revalidatePath=()=>{};' }
      if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser=async()=>state.actor;export const requireAdmin=async()=>{if(state.actor?.role!=="ADMIN")throw Error("denied");return state.actor};' }
      if (args.path.endsWith('auth-error')) return { contents: 'export const logAuthError=()=>{};' }
      return { contents: 'export const getDb=()=>state.db;' }
    })
  } }] })
  type Result = { success: boolean; message: string; code: string; orderId: string; quote: { quoteHash: string; subtotal: number; discount: number; total: number } }
  const mod = { exports: {} as Record<string, (input: unknown) => Promise<Result>> }
  new Function('module', 'exports', 'require', 'state', result.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  return mod.exports
}

function fixture() {
  const code = { id: 'cm000000000000000000000001', code: 'ABCD234567', type: 'PERCENT', value: 20, maxUsers: 1, maxUsesPerUser: 2, isActive: true, updatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) }
  const cart = { checkoutKey: 'b9ec07be-a73b-47d8-b230-7247827c0d28', items: [{ quantity: 2, grind: 'WHOLE_BEAN', grindDevice: null,
    product: { id: 'sku', slug: 'coffee', name: 'قهوه', weightGrams: 500, price: 800000, isActive: true, catalogProduct: { isActive: true }, grindOptions: ['WHOLE_BEAN'] } }] }
  const state = { actor: { id: 'owner', role: 'CUSTOMER' } as { id: string; role: string } | null, code, cart, db: {} as unknown,
    saved: null as Record<string, unknown> | null, redemptions: [] as { userId: string; orderId: string; discountCodeId: string; amount: number }[], createdCodes: [] as Record<string, unknown>[], locks: 0, failLedger: false }
  const db = {
    cart: { findUnique: async () => cart },
    address: { findFirst: async () => ({ recipientName: 'آزمون', province: 'تهران', city: 'تهران', addressLine: 'آدرس تست پلاک ۱', postalCode: '1234567890', phone: '09121234567' }) },
    user: { findUnique: async () => state.actor },
    discountCode: { findUnique: async ({ where }: { where: { code: string } }) => where.code === code.code ? code : null,
      create: async ({ data }: { data: Record<string, unknown> }) => { state.createdCodes.push(data); return data },
      updateMany: async ({ where, data }: { where: { updatedAt: Date }; data: { isActive: boolean } }) => {
        if (where.updatedAt.getTime() !== code.updatedAt.getTime()) return { count: 0 }
        code.isActive = data.isActive; code.updatedAt = new Date(code.updatedAt.getTime() + 1); return { count: 1 }
      } },
    order: { findUnique: async () => state.saved, create: async ({ data }: { data: Record<string, unknown> }) => { state.saved = { ...data, id: 'order' }; return { id: 'order' } } },
    discountRedemption: { create: async ({ data }: { data: typeof state.redemptions[number] }) => { if (state.failLedger) throw new Error('rollback'); state.redemptions.push(data); return data } },
    $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
      const text = sql.join('?')
      if (text.includes('FROM "DiscountCode"') && text.includes('FOR UPDATE')) state.locks++
      if (text.includes('COUNT(DISTINCT')) return [{ users: new Set(state.redemptions.map(r => r.userId)).size, userUses: state.redemptions.filter(r => r.userId === values[0]).length }]
      return []
    },
  }
  state.db = { ...db, $transaction: async (callback: (tx: typeof db) => unknown) => {
    const saved = state.saved, count = state.redemptions.length
    try { return await callback(db) } catch (error) { state.saved = saved; state.redemptions.splice(count); throw error }
  } }
  return state
}

test('generated coupon codes are cryptographically random strings in the accepted alphabet', () => {
  const codes = Array.from({ length: 1000 }, generateDiscountCode)
  assert.equal(new Set(codes).size, codes.length)
  assert.ok(codes.every(code => /^[A-HJ-NP-Z2-9]{10}$/.test(code)))
})

test('admin generation and status enforce authorization, limits, expiry and stale edits', async () => {
  const state = fixture(), api = await actions('actions/discount-code.actions.ts', state)
  const input = { type: 'FIXED', value: '۵۰۰۰۰', maxUsers: '۱۰', maxUsesPerUser: '۲', validDays: '۷', code: 'FORGED' }
  await assert.rejects(api.createDiscountCodeAction(input), /denied/)
  state.actor = { id: 'admin', role: 'ADMIN' }
  assert.equal((await api.createDiscountCodeAction({ ...input, validDays: '0' })).success, false)
  assert.equal((await api.createDiscountCodeAction(input)).success, true)
  assert.equal(state.createdCodes.length, 1)
  const created = state.createdCodes[0]
  assert.notEqual(created.code, 'FORGED')
  assert.equal(created.maxUsers, 10); assert.equal(created.maxUsesPerUser, 2)
  assert.ok(Math.abs((created.expiresAt as Date).getTime() - Date.now() - 7 * 86400000) < 3000)
  const status = { id: state.code.id, expectedUpdatedAt: state.code.updatedAt.toISOString(), isActive: false }
  assert.equal((await api.setDiscountCodeStatusAction(status)).success, true)
  assert.equal((await api.setDiscountCodeStatusAction({ ...status, isActive: true })).success, false)
})

test('preview is read-only; placement snapshots discounted totals and consumes once, with rollback on failure', async () => {
  const state = fixture(), api = await actions('actions/discount-code.actions.ts', state), order = await actions('actions/order.actions.ts', state)
  const db = state.db as Parameters<typeof checkoutQuote>[1]
  const base = await checkoutQuote('owner', db)
  const input = { checkoutKey: base.checkoutKey, quoteHash: base.quoteHash, code: state.code.code.toLowerCase(), userId: 'victim' }
  state.actor = null; assert.equal((await api.applyDiscountCodeAction(input)).success, false)
  state.actor = { id: 'owner', role: 'CUSTOMER' }
  const preview = await api.applyDiscountCodeAction(input)
  assert.equal(preview.success, true); assert.equal(preview.quote.discount, 320000); assert.equal(preview.quote.total, 1280000)
  assert.notEqual(preview.quote.quoteHash, base.quoteHash)
  assert.equal(state.redemptions.length, 0)
  assert.equal((await api.applyDiscountCodeAction({ ...input, quoteHash: '0'.repeat(64) })).success, false)
  const place = { checkoutKey: base.checkoutKey, quoteHash: preview.quote.quoteHash, discountCode: state.code.code, shippingMethod: 'POST', discount: 1, total: 1 }
  state.failLedger = true
  assert.equal((await order.placeOrderAction(place)).success, false)
  assert.equal(state.saved, null); assert.equal(state.redemptions.length, 0)
  state.failLedger = false
  assert.equal((await order.placeOrderAction(place)).success, true)
  assert.ok(state.locks > 0)
  assert.equal(state.saved!.discount, 320000); assert.equal(state.saved!.total, 1280000); assert.equal(state.saved!.discountCode, state.code.code)
  assert.deepEqual(state.redemptions[0], { orderId: 'order', userId: 'owner', discountCodeId: state.code.id, amount: 320000 })
  state.code.isActive = false
  assert.equal((await order.placeOrderAction(place)).success, true)
  assert.equal(state.redemptions.length, 1)
  assert.equal(discountConsumptionStage, 'ORDER_PLACED')
})

test('placement rechecks quotas, active status and expiration after a successful preview', async () => {
  for (const invalidation of ['expired', 'inactive', 'new-user-full', 'user-full']) {
    const state = fixture(), api = await actions('actions/discount-code.actions.ts', state), order = await actions('actions/order.actions.ts', state)
    const base = await checkoutQuote('owner', state.db as Parameters<typeof checkoutQuote>[1])
    const preview = await api.applyDiscountCodeAction({ code: state.code.code, checkoutKey: base.checkoutKey, quoteHash: base.quoteHash })
    if (invalidation === 'expired') state.code.expiresAt = new Date(0)
    if (invalidation === 'inactive') state.code.isActive = false
    if (invalidation === 'new-user-full') state.redemptions.push({ userId: 'other', orderId: 'old', discountCodeId: state.code.id, amount: 1 })
    if (invalidation === 'user-full') for (let i = 0; i < 2; i++) state.redemptions.push({ userId: 'owner', orderId: 'old' + i, discountCodeId: state.code.id, amount: 1 })
    assert.equal((await order.placeOrderAction({ checkoutKey: base.checkoutKey, quoteHash: preview.quote.quoteHash, discountCode: state.code.code, shippingMethod: 'POST' })).success, false)
    assert.equal(state.saved, null)
  }
})
