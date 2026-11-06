import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { checkoutQuote } from '../../lib/checkout'

test('address writes take verified contact from the current owner, preserve/clear alternate and reject unverified sessions', async () => {
  const state = { actor: { id: 'owner', sessionVersion: 0 } as { id: string; sessionVersion: number } | null,
    owner: { name: 'صاحب حساب', phone: '09121234567', phoneVerifiedAt: new Date() as Date | null, sessionVersion: 0 },
    address: { id: 'address', phone: '09121234567', alternatePhone: '02112345678' }, writes: [] as Record<string, unknown>[], db: {} as unknown }
  const tx = { $queryRaw: async () => [],
    user: { findUnique: async ({ where }: { where: { id: string } }) => { assert.equal(where.id, 'owner'); return state.owner } },
    address: { findFirst: async ({ where }: { where: { userId: string } }) => { assert.equal(where.userId, 'owner'); return state.address },
      update: async ({ data }: { data: Record<string, unknown> }) => { state.writes.push(data); return data } } }
  state.db = { $transaction: async (cb: (db: typeof tx) => unknown) => cb(tx) }
  const bundle = await build({ entryPoints: ['actions/address.actions.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', conditions: ['react-server'], plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|db|auth-error))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/db$/ }, args => args.importer.endsWith('checkout.ts') ? { path: 'db', namespace: 'stub' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser=async()=>state.actor;' }
      if (args.path.endsWith('db')) return { contents: 'export const getDb=()=>state.db;' }
      return { contents: 'export const revalidatePath=()=>{}, logAuthError=()=>{};' }
    })
  } }] })
  const mod = { exports: {} as { saveAddressAction: (input: unknown) => Promise<{ success: boolean; message?: string }> } }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  const input = { province: 'تهران', city: 'تهران', addressLine: 'نشانی آزمایشی پلاک ۱', postalCode: '۱۲۳۴۵۶۷۸۹۰', phone: 'forged', userId: 'victim', recipientName: 'forged', alternatePhone: '۰۲۱۸۷۶۵۴۳۲۱' }
  const save = mod.exports.saveAddressAction
  assert.equal((await save(input)).success, true)
  assert.equal(state.writes[0].phone, state.owner.phone)
  assert.equal(state.writes[0].alternatePhone, '02187654321')
  assert.equal(state.writes[0].recipientName, state.owner.name)
  assert.equal('userId' in state.writes[0], false)
  assert.equal((await save({ ...input, alternatePhone: '' })).success, true)
  assert.equal(state.writes.at(-1)!.alternatePhone, null)
  assert.equal((await save({ ...input, alternatePhone: undefined })).success, true)
  assert.equal(state.writes.at(-1)!.alternatePhone, '02112345678')
  assert.equal((await save({ ...input, alternatePhone: 'bad' })).success, false)
  state.owner.phoneVerifiedAt = null
  assert.match((await save(input)).message!, /تأیید/)
  state.owner.phoneVerifiedAt = new Date(); state.owner.sessionVersion = 1
  assert.equal((await save(input)).success, false)
  state.actor = null; assert.equal((await save(input)).success, false)
  assert.equal(state.writes.length, 3)
})

test('checkout requires verified phone and snapshots both contacts in the confirmation hash', async () => {
  const owner = { phone: '09121234567', phoneVerifiedAt: new Date() as Date | null }
  const address = { phone: '09129999999', alternatePhone: '02112345678', recipientName: 'تست', province: 'تهران', city: 'تهران', addressLine: 'نشانی آزمایشی پلاک ۱', postalCode: '1234567890' }
  const db = { user: { findUnique: async () => owner }, address: { findFirst: async () => address },
    cart: { findUnique: async () => ({ checkoutKey: 'checkout', items: [{ quantity: 1, grind: 'WHOLE_BEAN', grindDevice: null, product: { id: 'sku', slug: 'sku', name: 'تست', weightGrams: 500, price: 1000, isActive: true, catalogProduct: { isActive: true }, grindOptions: ['WHOLE_BEAN'] } }] }) } } as unknown as Parameters<typeof checkoutQuote>[1]
  const original = await checkoutQuote('owner', db)
  assert.equal(original.shipping.phone, owner.phone)
  assert.equal(original.shipping.alternatePhone, address.alternatePhone)
  address.alternatePhone = '02187654321'
  assert.notEqual((await checkoutQuote('owner', db)).quoteHash, original.quoteHash)
  assert.equal(original.shipping.alternatePhone, '02112345678')
  owner.phone = '09121234568'
  assert.notEqual((await checkoutQuote('owner', db)).quoteHash, original.quoteHash)
  assert.equal(original.shipping.phone, '09121234567')
  owner.phoneVerifiedAt = null
  await assert.rejects(checkoutQuote('owner', db), /تأیید/)
})
