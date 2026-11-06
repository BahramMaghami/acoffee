import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

test('admin search filters count and rows together, normalizes phones and preserves pagination and authorization', async () => {
  type Where = Record<string, { contains?: string; mode?: string; in?: string[] }>
  const state = { allowed: true, counts: [] as Where[], reads: [] as { where: Where; skip: number; take: number }[] }
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: 'بهرام', phone: '09121234567', email: `buyer${i}@example.test` }))
  rows.push({ id: 'other', name: 'کاربر دیگر', phone: '09139999999', email: 'other@example.test' })
  const matching = (where: Where) => rows.filter(row => Object.entries(where).every(([field, value]) => {
    if (value.in) return value.in.includes(row.id)
    const term = value.contains!.replace(/\\([\\%_])/g, '$1').toLowerCase()
    return row[field as keyof typeof row].toLowerCase().includes(term)
  }))
  const tx = { user: {
    count: async ({ where }: { where: Where }) => { state.counts.push(where); return matching(where).length },
    findMany: async (args: { where: Where; skip: number; take: number }) => { state.reads.push(args); return matching(args.where).slice(args.skip, args.skip + args.take) },
  } }
  const db = { $transaction: async (fn: (transaction: typeof tx) => unknown) => fn(tx) }
  const bundle = await build({ entryPoints: ['lib/admin-users.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'], plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^\.\/(current-user|db|auth-error)$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path.endsWith('current-user')) return { contents: 'export const requireAdmin=async()=>{if(!state.allowed) throw new Error("forbidden"); return {id:"admin"}};' }
      if (args.path.endsWith('/db')) return { contents: 'export const getDb=()=>db;' }
      return { contents: 'export const logAuthError=()=>{};' }
    })
  } }] })
  const mod = { exports: {} as { getAdminUsers: (page?: unknown, search?: unknown) => Promise<{ users: typeof rows; total: number; pages: number; page: number; search: { field: string; q: string } }> } }
  new Function('module', 'exports', 'require', 'state', 'db', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state, db)
  const get = mod.exports.getAdminUsers
  for (const [field, q] of [['name', ' بهرا '], ['email', 'BUYER'], ['phone', '۰۹۱۲'], ['phone', '+۹۸ (۹۱۲) ۱۲۳-۴۵۶۷']]) {
    const result = await get('1', { field, q })
    assert.equal(result.total, 25)
    assert.equal(result.pages, 2)
    assert.equal(result.users.length, 20)
    assert.ok(result.users.every(row => row.id !== 'other'))
    assert.deepEqual(state.counts.at(-1), state.reads.at(-1)?.where)
  }
  const last = await get('99', { field: 'email', q: 'buyer' })
  assert.equal(last.page, 2)
  assert.equal(last.users.length, 5)
  assert.equal((await get('1', { field: 'name', q: 'وجود ندارد' })).total, 0)
  assert.equal((await get('1', { field: 'phone', q: '---' })).total, 0)
  assert.equal((await get('1', { field: 'name', q: '   ' })).total, 26)
  assert.equal((await get()).total, 26)
  await get('1', { field: 'email', q: '%_\\' })
  assert.equal(state.counts.at(-1)?.email.contains, '\\%\\_\\\\')
  for (const search of [{ field: 'passwordHash', q: 'x' }, { field: ['name'], q: 'x' }, { field: 'name', q: ['x'] }, { field: 'name', q: 'x'.repeat(201) }]) {
    await assert.rejects(get('1', search))
  }
  state.allowed = false
  const before = state.reads.length
  await assert.rejects(get('1', { field: 'email', q: 'buyer' }), /forbidden/)
  assert.equal(state.reads.length, before)
})
