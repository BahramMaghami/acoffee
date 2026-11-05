import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateDiscount, calculateProductPrices, categoryDefaults, maxPrice } from '../../lib/product-pricing'
import { discountInputSchema } from '../../lib/validators/admin-products'
import { productPricePreview } from '../../lib/product-price-preview'
import { discountedVariant, hasVariantDiscount, productVariant, type StoreProduct } from '../../lib/storefront'

test('percentage and final price discounts use whole toman and never compound', () => {
  const parsed = discountInputSchema.parse({ originalPrice: '۱٬۰۰۰٬۰۰۰', mode: 'percent', value: '۲۰' })
  const first = calculateDiscount(parsed)
  assert.deepEqual(first, { price: 800000, originalPrice: 1000000, discountPercent: 20, manualPrice: true })
  assert.deepEqual(calculateDiscount({ originalPrice: first.originalPrice, mode: 'final', value: first.price }), first)
  assert.equal(calculateDiscount({ originalPrice: 101, mode: 'percent', value: 50 }).price, 51)
  assert.equal(calculateDiscount({ originalPrice: 101, mode: 'percent', value: 50 }).discountPercent, 49)
  assert.equal(calculateDiscount({ originalPrice: maxPrice, mode: 'percent', value: 99 }).price, 1000000000000)
  assert.equal(calculateDiscount({ originalPrice: 10000, mode: 'final', value: 9999 }).discountPercent, 0)
})

test('invalid discounts cannot reach server pricing', () => {
  for (const value of ['', '0', '100', '-1', '1.5', 'no']) assert.equal(discountInputSchema.safeParse({ originalPrice: '10000', mode: 'percent', value }).success, false)
  for (const value of ['0', '10000', '10001']) assert.equal(discountInputSchema.safeParse({ originalPrice: '10000', mode: 'final', value }).success, false)
  assert.equal(discountInputSchema.safeParse({ originalPrice: '', mode: 'percent', value: '10' }).success, false)
  assert.throws(() => calculateDiscount({ originalPrice: 1, mode: 'percent', value: 10 }))
})

test('discounts apply to every weight/category and take precedence over ordinary prices', () => {
  for (const category of ['blend', 'traditional', 'cafe', 'new', 'wholesale']) {
    const rows = calculateProductPrices({ ...categoryDefaults(category), weights: [250], roasts: [], grades: ['standard'],
      basePrices: { standard: 8000 }, overrides: { '250-default-standard': 1234 },
      discounts: { '250-default-standard': { originalPrice: 2000, mode: 'final', value: 1500 } } })
    assert.equal(rows[0].price, 1500)
    assert.equal(rows[0].discountPercent, 25)
  }
})

test('custom 10kg discounts replace the default and discounted 5kg feeds its dependency', () => {
  const input = { ...categoryDefaults('wholesale'), basePrices: { standard: 100000 }, overrides: {}, discounts: {
    '5000-medium-standard': { originalPrice: 500000, mode: 'percent' as const, value: 20 },
  } }
  assert.equal(calculateProductPrices(input).find(r => r.key === '10000-medium-standard')!.price, 776000)
  const custom = calculateProductPrices({ ...input, discounts: { ...input.discounts, '10000-medium-standard': { originalPrice: 1000000, mode: 'percent', value: 10 } } })
  assert.equal(custom.find(r => r.key === '10000-medium-standard')!.price, 900000)
  const removed = calculateProductPrices({ ...input, discounts: { '10000-medium-standard': null } })
  assert.equal(removed.find(r => r.key === '10000-medium-standard')!.price, 1000000)
  assert.equal(removed.find(r => r.key === '10000-medium-standard')!.discountPercent, 0)
})

test('invalid discount retains rows, isolates dependencies, and can be corrected or reset', () => {
  const options = categoryDefaults('wholesale')
  const raw = { basePrices: { standard: '100000', vip: '' }, overrides: {}, discounts: { '5000-medium-standard': { originalPrice: '500000', mode: 'percent' as const, value: 'abc' } } }
  const preview = productPricePreview(options, raw)
  assert.equal(preview.rows.length, 8)
  assert.equal(preview.rows.find(r => r.key === '5000-medium-standard')!.invalid, true)
  assert.equal(preview.rows.find(r => r.key === '10000-medium-standard')!.invalid, true)
  assert.equal(preview.rows.find(r => r.key === '5000-medium-dark-standard')!.invalid, false)
  assert.ok(preview.errors['discounts.5000-medium-standard.value'])
  raw.discounts['5000-medium-standard'].value = '۲۰'
  assert.equal(productPricePreview(options, raw).rows.find(r => r.key === '10000-medium-standard')!.price, 776000)
  assert.equal(productPricePreview(options, { ...raw, discounts: {} }).rows.find(r => r.key === '10000-medium-standard')!.price, 970000)
})

test('badges support non-wholesale variants and exclude inactive/unknown prices', () => {
  const product: StoreProduct = { id: 'test', slug: 'test', name: 'قهوه', category: 'blend', categoryLabel: 'ترکیبی', wholesale: false,
    imageUrl: null, description: '', origin: '', weights: [250, 500], roasts: [], grades: ['standard'],
    prices: { '250-default-standard': 800, '500-default-standard': null }, originalPrices: { '250-default-standard': 1000 },
    skuIds: { '250-default-standard': 'sku1', '500-default-standard': 'sku2' }, availability: { '250-default-standard': true, '500-default-standard': true },
    discounts: { '250-default-standard': 20, '500-default-standard': 50 }, grindOptions: {} }
  assert.equal(discountedVariant(product)?.id, 'sku1')
  product.availability['250-default-standard'] = false
  assert.equal(discountedVariant(product), null)
  product.availability['250-default-standard'] = true
  product.discounts['250-default-standard'] = 0
  assert.equal(hasVariantDiscount(productVariant(product, 250)!), true)
})
