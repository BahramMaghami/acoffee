import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

test('admin mutation rejects old paid toggles and deletion of financial history, while preserving delivery changes', async () => {
  const order = { id: 'cm000000000000000000000001', paymentStatus: 'UNPAID', status: 'PENDING', paidAt: null, deliveredAt: null, updatedAt: new Date(), payments: [] as { method: string; status: string }[] }
  const state = { removed: 0, updates: [] as unknown[], role: 'ADMIN', version: 0 }
  const tx = {
    $queryRaw: async () => [], user: { findUnique: async () => ({ role: state.role, sessionVersion: state.version }) },
    order: { findUnique: async () => order, delete: async () => { state.removed++ }, update: async (input: unknown) => { state.updates.push(input) } },
    orderItem: { deleteMany: async () => {} }, paymentAttempt: { deleteMany: async () => {} }, discountReservation: { findUnique: async () => null },
  }
  const db = { $transaction: async (run: (tx: unknown) => unknown) => run(tx) }
  const bundle = await build({ entryPoints: ['actions/order.actions.ts'], platform: 'node', format: 'cjs', bundle: true, write: false, conditions: ['react-server'], plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(db|current-user|auth-error))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, () => ({ path: '@/lib/db', namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path === 'next/cache') return { contents: 'export const revalidatePath=()=>{}' }
      if (args.path.endsWith('auth-error')) return { contents: 'export const logAuthError=()=>{}' }
      if (args.path.endsWith('current-user')) return { contents: 'export const requireAdmin=async()=>({id:"admin",role:"ADMIN",sessionVersion:0});export const getCurrentUser=requireAdmin' }
      return { contents: 'export const getDb=()=>db' }
    })
  } }] })
  const mod = { exports: {} as { manageOrderAction: (input: unknown) => Promise<{ success: boolean }> } }
  new Function('module', 'exports', 'require', 'db', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), db)
  const mutate = mod.exports.manageOrderAction
  const input = { orderId: order.id, expectedUpdatedAt: order.updatedAt.toISOString(), operation: 'delete' }
  for (const payment of [{ method: 'MANUAL', status: 'VOIDED' }, { method: 'ZARINPAL', status: 'SUCCEEDED' }, { method: 'ZARINPAL', status: 'UNKNOWN' }, { method: 'DISCOUNT', status: 'SUCCEEDED' }]) {
    order.payments = [payment]
    assert.equal((await mutate(input)).success, false)
  }
  order.payments = []
  for (const paymentStatus of ['PAID', 'REFUNDED']) {
    order.paymentStatus = paymentStatus
    assert.equal((await mutate(input)).success, false)
  }
  order.paymentStatus = 'UNPAID'
  assert.equal((await mutate({ ...input, operation: 'status', field: 'paid', value: true })).success, false)
  assert.equal(state.removed, 0); assert.equal(state.updates.length, 0)
  assert.equal((await mutate({ ...input, operation: 'status', field: 'delivered', value: true })).success, true)
  assert.equal(state.updates.length, 1)
  state.version = 1
  assert.equal((await mutate(input)).success, false)
  state.version = 0
  assert.equal((await mutate({ ...input, expectedUpdatedAt: new Date(0).toISOString() })).success, false)
  assert.equal((await mutate(input)).success, true)
  assert.equal(state.removed, 1)
})
