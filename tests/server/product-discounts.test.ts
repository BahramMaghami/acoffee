import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

test('admin save calculates payable amounts, retains legacy prices, and enforces role and stale-edit checks', async () => {
  const date = '2026-11-06T00:00:00.000Z'
  const prior = { id: 'sku', slug: 'coffee--500-default-standard', manualPrice: true, price: 123456, originalPrice: null, discountPercent: 3, isActive: true }
  const existing = { id: 'parent', slug: 'coffee', updatedAt: new Date(date), imagePublicId: null, imageUrl: null, description: 'توضیح', variants: [prior] }
  const written: Record<string, unknown>[] = []
  const state = { role: 'ADMIN', existing, db: {} as unknown }
  const tx = {
    user: { findUnique: async () => ({ role: state.role }) },
    category: { findUnique: async () => ({ id: 'category', defaultWeights: [500], defaultRoasts: [], defaultGrades: ['standard'], wholesale: false }) },
    catalogProduct: { findUnique: async () => state.existing, update: async () => state.existing },
    product: { upsert: async ({ update }: { update: Record<string, unknown> }) => { written.push(update) } },
  }
  state.db = { ...tx, $transaction: async (cb: (db: typeof tx) => unknown) => cb(tx) }
  const bundle = await build({ entryPoints: ['actions/product.actions.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|db|auth-error|cloudinary))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path.endsWith('current-user')) return { contents: 'export const requireAdmin=async()=>{if(state.role!=="ADMIN")throw Error("denied");return {id:"admin"}};' }
      if (args.path.endsWith('db')) return { contents: 'export const getDb=()=>state.db;' }
      if (args.path.endsWith('cloudinary')) return { contents: 'export const createImageUpload=()=>{}, verifyProductImage=()=>{}, removeProductImage=()=>{};' }
      return { contents: 'export const revalidatePath=()=>{}, logAuthError=()=>{};' }
    })
  } }] })
  const mod = { exports: {} as { saveProductAction: (input: unknown) => Promise<{ success: boolean; message: string }> } }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  const save = mod.exports.saveProductAction
  const input = { id: 'parent', expectedUpdatedAt: date, categoryId: 'category', newCategoryName: '', name: 'قهوهٔ آزمون',
    weights: [500], roasts: [], noRoast: true, grades: ['standard'], basePrices: { standard: '', vip: '' },
    overrides: { '500-default-standard': '123456' }, availability: {}, isActive: true, imagePublicId: null, removeImage: false, confirmRemoved: false }
  assert.equal((await save(input)).success, true)
  assert.equal(written.at(-1)!.price, 123456)
  assert.equal(written.at(-1)!.discountPercent, 3)
  const discounts = { '500-default-standard': { originalPrice: '1000000', mode: 'percent', value: '۲۰' } }
  assert.equal((await save({ ...input, discounts })).success, true)
  assert.equal(written.at(-1)!.price, 800000)
  assert.equal(written.at(-1)!.originalPrice, 1000000)
  assert.equal(written.at(-1)!.discountPercent, 20)
  assert.equal((await save({ ...input, discounts: { '500-default-standard': null } })).success, true)
  assert.equal(written.at(-1)!.discountPercent, 0)
  const count = written.length
  assert.equal((await save({ ...input, discounts: { '500-default-standard': { ...discounts['500-default-standard'], value: '101' } } })).success, false)
  assert.equal((await save({ ...input, expectedUpdatedAt: '2026-11-05T00:00:00.000Z' })).success, false)
  state.role = 'USER'
  await assert.rejects(save(input), /denied/)
  assert.equal(written.length, count)
})
