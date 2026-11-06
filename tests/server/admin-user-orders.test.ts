import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

test('admin user orders scope totals and pages, reject invalid users and require admin access', async () => {
  const user = { id: 'clabcdefg00000123456789012', name: 'کاربر آزمایشی', email: 'buyer@example.test' }
  const state = { allowed: true, queries: 0 }
  const orders = Array.from({ length: 25 }, (_, i) => ({ id: String(i), userId: user.id }))
  orders.push({ id: 'other-order', userId: 'clabcdefg00000123456789013' })
  type Filter = { userId?: string }
  const matches = (where: Filter) => orders.filter(order => !where.userId || order.userId === where.userId)
  const tx = {
    user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === user.id ? user : null },
    order: {
      count: async ({ where }: { where: Filter }) => matches(where).length,
      findMany: async ({ where, skip, take }: { where: Filter; skip: number; take: number }) => matches(where).slice(skip, skip + take),
    },
  }
  const db = { $transaction: async (fn: (transaction: typeof tx) => unknown) => { state.queries++; return fn(tx) } }
  const bundle = await build({
    entryPoints: ['lib/admin-orders.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'],
    plugins: [{ name: 'admin-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(next\/navigation|\.\/(current-user|db|auth-error))$/ }, args => ({ path: args.path, namespace: 'stub' }))
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
        if (args.path.endsWith('current-user')) return { contents: 'export const requireAdmin=async()=>{if(!state.allowed) throw new Error("forbidden")};' }
        if (args.path.endsWith('/db')) return { contents: 'export const getDb=()=>db;' }
        if (args.path === 'next/navigation') return { contents: 'export const notFound=()=>{throw new Error("not found")};' }
        return { contents: 'export const logAuthError=()=>{};' }
      })
    } }],
  })
  const mod = { exports: {} as { getAdminOrders: (page?: unknown, userId?: unknown) => Promise<{ total: number; page: number; pages: number; user: typeof user | null; orders: typeof orders }> } }
  new Function('module', 'exports', 'require', 'state', 'db', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state, db)
  const get = mod.exports.getAdminOrders
  const first = await get('1', user.id)
  assert.equal(first.total, 25)
  assert.equal(first.pages, 2)
  assert.equal(first.orders.length, 20)
  assert.deepEqual(first.user, user)
  assert.ok(first.orders.every(order => order.userId === user.id))
  const last = await get('999', user.id)
  assert.equal(last.page, 2)
  assert.equal(last.orders.length, 5)
  assert.ok(last.orders.every(order => order.userId === user.id))
  assert.equal((await get()).total, 26)
  for (const invalid of ['', ['one', 'two'], 'bad-id', 'clabcdefg00000123456789099']) {
    await assert.rejects(get('1', invalid), /not found/)
  }
  orders.splice(0, 25)
  const empty = await get('2', user.id)
  assert.equal(empty.total, 0)
  assert.equal(empty.page, 1)
  assert.deepEqual(empty.orders, [])
  state.allowed = false
  const before = state.queries
  await assert.rejects(get('1', user.id), /forbidden/)
  assert.equal(state.queries, before)
})
