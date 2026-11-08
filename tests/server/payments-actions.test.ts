import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

process.env.ZARINPAL_SANDBOX = 'true'
process.env.ZARINPAL_MERCHANT_ID = 'f58f584a-2d2a-4daa-974a-8259d22ba8e6'
process.env.PAYMENT_BASE_URL = 'http://localhost:3000'

async function actions(state: unknown) {
  const bundle = await build({ entryPoints: ['actions/payment.actions.ts'], platform: 'node', format: 'cjs', bundle: true, write: false, conditions: ['react-server'], plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|db|payments))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, () => ({ path: '@/lib/db', namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path === 'next/cache') return { contents: 'export const revalidatePath=()=>{}' }
      if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser=async()=>state.actor' }
      if (args.path.endsWith('/db')) return { contents: 'export const getDb=()=>state.db' }
      return { contents: 'export const lockPaymentOrder=async()=>{};export const paymentService=()=>({begin:async(...args)=>{state.calls.push(args);return {orderId:args[0],status:"PENDING",message:"pending"}}})' }
    })
  } }] })
  type Result = { success: boolean; message: string; items: unknown[] }
  const mod = { exports: {} as Record<string, (input: unknown) => Promise<Result>> }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  return mod.exports
}

test('payment actions discard client amounts and repricing preserves historical order and missing selections for correction', async () => {
  const orderId = 'cm000000000000000000000001'
  const order = { id: orderId, userId: 'owner', paymentStatus: 'UNPAID', status: 'PENDING', paymentEnvironment: null as string | null,
    supersededAt: null as Date | null, total: 111, discountCode: 'OLDCOUPON', payments: [] as { status: string }[],
    items: [{ product: { slug: 'current-sku' }, productSlug: 'old-sku', quantity: 1, grind: 'GROUND', grindDevice: null },
      { product: null, productSlug: 'deleted-sku', quantity: 2, grind: null, grindDevice: null }] }
  const state = { actor: { id: 'owner', sessionVersion: 0, role: 'CUSTOMER' } as { id: string; sessionVersion: number; role: string } | null,
    calls: [] as unknown[][], db: {} as unknown, version: 0, replaced: null as unknown, replacement: false }
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async () => ({ sessionVersion: state.version }) },
    order: { findFirst: async ({ where }: { where: Record<string, unknown> }) => where.repricedFromId ? state.replacement ? { id: 'replacement' } : null : order.userId === where.userId ? order : null,
      update: async ({ data }: { data: { supersededAt: Date } }) => { order.supersededAt = data.supersededAt } },
    cart: { upsert: async (input: unknown) => { state.replaced = input } },
    discountReservation: { findUnique: async () => null },
  }
  state.db = { ...tx, $transaction: async (run: (tx: unknown) => unknown) => run(tx) }
  const api = await actions(state)
  state.actor = null
  assert.equal((await api.startPaymentAction({ orderId })).success, false)
  state.actor = { id: 'owner', sessionVersion: 0, role: 'CUSTOMER' }
  assert.equal((await api.startPaymentAction({ orderId, total: 1, amountRial: 1, userId: 'victim' })).success, true)
  assert.deepEqual(state.calls, [[orderId, state.actor]])
  assert.equal((await api.recordManualPaymentAction({ orderId })).success, false)
  state.actor.id = 'other'
  assert.equal((await api.prepareOrderRepriceAction({ orderId })).success, false)
  state.actor.id = 'owner'
  for (const status of ['PENDING', 'UNKNOWN', 'VERIFYING', 'REQUESTING']) {
    order.payments = [{ status }]
    assert.equal((await api.prepareOrderRepriceAction({ orderId })).success, false)
    assert.equal(state.replaced, null)
  }
  order.payments = []; state.version = 1
  assert.equal((await api.prepareOrderRepriceAction({ orderId })).success, false)
  state.version = 0; state.replacement = true
  assert.equal((await api.prepareOrderRepriceAction({ orderId })).success, false)
  state.replacement = false
  const result = await api.prepareOrderRepriceAction({ orderId, discountCode: 'FORGED' })
  assert.equal(result.success, true)
  assert.deepEqual(result.items, [{ productId: 'current-sku', quantity: 1, grind: 'GROUND', grindDevice: null }, { productId: 'deleted-sku', quantity: 2, grind: null, grindDevice: null }])
  assert.ok(order.supersededAt)
  assert.equal(order.total, 111); assert.equal(order.discountCode, 'OLDCOUPON')
  assert.deepEqual((state.replaced as { where: unknown }).where, { userId: 'owner' })
  order.paymentEnvironment = 'LIVE'
  assert.equal((await api.prepareOrderRepriceAction({ orderId })).success, false)
})
