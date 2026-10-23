import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoryDefaults, calculateProductPrices, moneyRatio, maxPrice } from '../../lib/product-pricing'
import { productFormSchema, type ProductFormInput } from '../../lib/validators/admin-products'
import { productVariant, startingPrice, type StoreProduct } from '../../lib/storefront'

const input: ProductFormInput = { categoryId: 'category', newCategoryName: '', name: 'قهوهٔ تست', weights: [], roasts: [], noRoast: false, grades: [],
  basePrices: { standard: '۲٬۸۰۰٬۰۰۰', vip: '٣١٠٠٠٠٠' }, overrides: {}, availability: {}, isActive: true, imagePublicId: null, removeImage: false, confirmRemoved: false }
test('category defaults distinguish single-origin, traditional, wholesale and new categories', () => {
  assert.deepEqual(categoryDefaults('wholesale').weights, [5000, 10000])
  assert.deepEqual(categoryDefaults('traditional').roasts, [])
  assert.deepEqual(categoryDefaults('cafe').grades, ['standard'])
  assert.deepEqual(categoryDefaults('new'), categoryDefaults('blend'))
})
test('Persian/Arabic prices normalize and invalid, oversized and duplicate input is rejected', () => {
  const parsed = productFormSchema.parse(input)
  assert.deepEqual(parsed.basePrices, { standard: 2800000, vip: 3100000 })
  for (const price of ['-1', '0', '0.5', '1e5', 'Infinity', String(maxPrice + 1)]) assert.equal(productFormSchema.safeParse({ ...input, basePrices: { standard: price, vip: '' } }).success, false)
  assert.equal(productFormSchema.safeParse({ ...input, weights: [500, 500] }).success, false)
  assert.equal(productFormSchema.safeParse({ ...input, categoryId: '', newCategoryName: '' }).success, false)
  assert.equal(productFormSchema.safeParse({ ...input, id: 'product' }).success, false)
})
test('weight prices and half-toman rounding are precise even at Decimal(14,0) limits', () => {
  assert.equal(moneyRatio(1, 500, 1000), 1)
  assert.equal(moneyRatio(maxPrice, 1000, 1000), maxPrice)
  assert.throws(() => moneyRatio(maxPrice, 2000, 1000))
  const rows = calculateProductPrices({ ...categoryDefaults('blend'), basePrices: { standard: 2800000, vip: 3100000 }, overrides: {} })
  assert.equal(rows.find(r => r.key === '250-medium-standard')!.price, 700000)
  assert.equal(rows.find(r => r.key === '500-medium-dark-vip')!.price, 1550000)
})
test('10kg derives from the final 5kg price and an explicit 10kg price takes precedence', () => {
  const base = { ...categoryDefaults('wholesale'), basePrices: { standard: 2300000, vip: 2600000 }, overrides: {} }
  assert.equal(calculateProductPrices(base).find(r => r.key === '10000-medium-standard')!.price, 22310000)
  const rows = calculateProductPrices({ ...base, overrides: { '5000-medium-standard': 12000000 } })
  assert.equal(rows.find(r => r.key === '10000-medium-standard')!.price, 23280000)
  assert.equal(rows.find(r => r.key === '10000-medium-standard')!.discountPercent, 3)
  const explicit = calculateProductPrices({ ...base, overrides: { '10000-medium-standard': 22000000 } }).find(r => r.key === '10000-medium-standard')!
  assert.equal(explicit.price, 22000000)
  assert.equal(explicit.discountPercent, 0)
  assert.equal(calculateProductPrices({ ...base, weights: [10000] })[0].price, 22310000)
  assert.equal(calculateProductPrices({ ...base, weights: [10000], overrides: { '5000-medium-standard': 1 } })[0].price, 22310000)
})
test('manual legacy prices and unknown amounts survive changes to the base rate', () => {
  const rows = calculateProductPrices({ ...categoryDefaults('wholesale'), basePrices: { standard: 1, vip: null }, overrides: { '10000-medium-vip': 32000000, '5000-medium-standard': null } })
  assert.equal(rows.find(r => r.key === '10000-medium-vip')!.price, 32000000)
  assert.equal(rows.find(r => r.key === '5000-medium-standard')!.price, null)
  assert.equal(rows.find(r => r.key === '10000-medium-standard')!.price, null)
})
test('live variant lookup requires the persisted SKU and ignores inactive prices', () => {
  const product: StoreProduct = { id: 'coffee', slug: 'coffee', name: 'تست', category: 'new', categoryLabel: 'جدید', wholesale: false,
    imageUrl: null, origin: '', description: '', weights: [250, 500], roasts: [], grades: ['vip'],
    prices: { '250-default-vip': 100, '500-default-vip': 200 }, skuIds: { '250-default-vip': 'old-sku', '500-default-vip': 'other-sku' },
    availability: { '250-default-vip': false, '500-default-vip': true }, discounts: {} }
  assert.equal(productVariant(product, 250)?.id, 'old-sku')
  assert.equal(productVariant(product, 1000), null)
  assert.equal(startingPrice(product), 200)
})
