import { test } from 'node:test'
import assert from 'node:assert/strict'
import { products, variants, productVariant, findVariant, startingPrice, cafeGroups } from '../../lib/storefront'

test('catalog matches the requested groups and has no invented tasting information', () => {
  assert.equal(products.filter((p) => p.category === 'retail').length, 7)
  assert.equal(products.filter((p) => p.category === 'traditional').length, 2)
  assert.equal(products.filter((p) => p.cafeGroup === 'robusta').length, 4)
  assert.equal(products.filter((p) => p.cafeGroup === 'arabica').length, 3)
  assert.equal(products.filter((p) => p.category === 'cafe').length, 7)
  assert.deepEqual(cafeGroups.map((group) => group.value), ['robusta', 'arabica'])
  const blends = products.filter((p) => p.category === 'blend')
  assert.equal(blends.length, 6)
  for (const product of blends) {
    assert.equal(product.cafeGroup, undefined)
    assert.deepEqual(product.grades, ['standard', 'vip'])
    const standard = productVariant(product, 250, 'medium', 'standard')!
    const vip = productVariant(product, 250, 'medium', 'vip')!
    assert.ok(standard)
    assert.ok(vip)
    assert.notEqual(standard.id, vip.id)
  }
  assert.equal(new Set(products.map((p) => p.description)).size, 1)
  assert.ok(products.every((p) => p.origin === '' && !('intensity' in p) && !('notes' in p)))
})
test('every weight, roast and grade has a unique SKU and invalid selections are rejected', () => {
  assert.equal(new Set(variants.map((v) => v.id)).size, variants.length)
  const cafe = products.find((p) => p.id === 'cafe-blend-robusta-100')!
  assert.ok(productVariant(cafe, 500, 'dark', 'vip'))
  assert.notEqual(productVariant(cafe, 500, 'dark', 'vip')!.id, productVariant(cafe, 500, 'medium', 'vip')!.id)
  assert.equal(productVariant(cafe, 1000, 'dark'), null)
  assert.equal(productVariant(cafe, 250), null)
  const retail = products.find((p) => p.id === 'arabica-100')!
  assert.equal(productVariant(retail, 250, 'dark'), null)
  assert.equal(productVariant(retail, 250, undefined, 'vip'), null)
  assert.equal(findVariant('arabica-100--1000-default-standard'), undefined)
})
test('missing prices stay unknown rather than becoming free products', () => {
  assert.ok(variants.every((v) => v.price === null))
  assert.ok(products.every((p) => startingPrice(p) === null))
  const priced = { ...products[0], prices: { '250-default-standard': 100_000, '100-default-standard': 0 } }
  assert.equal(productVariant(priced, 250)!.price, 100_000)
  assert.equal(productVariant(priced, 100)!.price, null)
})
