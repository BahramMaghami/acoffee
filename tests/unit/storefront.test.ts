import { test } from 'node:test'
import assert from 'node:assert/strict'
import { products, variants, productVariant, findVariant, startingPrice, cafeGroups, categories } from '../../lib/storefront'

test('catalog matches the requested groups and has no invented tasting information', () => {
  assert.deepEqual(categories.map((category) => category.value), ['blend', 'cafe', 'wholesale', 'traditional', 'nescafe'])
  assert.equal(products.length, 18)
  assert.equal(products.filter((p) => p.category === 'traditional').length, 2)
  assert.equal(products.filter((p) => p.cafeGroup === 'robusta').length, 5)
  assert.equal(products.filter((p) => p.cafeGroup === 'arabica').length, 3)
  assert.equal(products.filter((p) => p.category === 'cafe').length, 8)
  assert.deepEqual(cafeGroups.map((group) => group.value), ['robusta', 'arabica'])
  const blends = products.filter((p) => p.category === 'blend')
  assert.equal(blends.length, 6)
  assert.equal(blends.at(-1)!.id, 'cafe-blend-arabica-100')
  assert.equal(blends.filter((p) => p.name === '۱۰۰٪ عربیکا').length, 1)
  assert.equal(products.find((p) => p.id === 'cafe-ethiopia-lekempti')!.name, 'اتیوپی لمکپتی')
  assert.ok(products.some((p) => p.id === 'cafe-indonesia-ek'))
  assert.ok(products.some((p) => p.category === 'nescafe'))
  assert.equal(blends.filter((p) => p.grades.includes('vip')).length, 6)
  for (const product of blends.filter((p) => p.grades.includes('vip'))) {
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
  assert.ok(productVariant(cafe, 500, 'medium-dark', 'vip'))
  assert.notEqual(productVariant(cafe, 500, 'medium-dark', 'vip')!.id, productVariant(cafe, 500, 'medium', 'vip')!.id)
  assert.equal(productVariant(cafe, 1000, 'medium-dark'), null)
  assert.equal(productVariant(cafe, 250), null)
  for (const id of ['arabica-100', 'italian-roast-arabica-100']) {
    assert.equal(products.find((p) => p.id === id), undefined)
  }
  const wholesale = products.find((p) => p.category === 'wholesale')!
  assert.deepEqual(wholesale.weights, [5000])
  assert.equal(productVariant(wholesale, 5000, 'medium')!.weightGrams, 5000)
  assert.equal(productVariant(wholesale, 250, 'medium'), null)
  assert.equal(findVariant('cafe-blend-robusta-100--500-dark-vip'), undefined)
  assert.equal(findVariant('arabica-80--250-default-standard'), undefined)
  assert.equal(findVariant('arabica-100--1000-default-standard'), undefined)
})
test('missing prices stay unknown rather than becoming free products', () => {
  assert.ok(variants.every((v) => v.price === null))
  assert.ok(products.every((p) => startingPrice(p) === null))
  const priced = { ...products.find((p) => p.category === 'traditional')!, prices: { '250-default-standard': 100_000, '100-default-standard': 0 } }
  assert.equal(productVariant(priced, 250)!.price, 100_000)
  assert.equal(productVariant(priced, 100)!.price, null)
})
