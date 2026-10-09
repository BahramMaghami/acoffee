import { test } from 'node:test'
import assert from 'node:assert/strict'
import { products, variants, productVariant, findVariant, startingPrice, cafeGroups, categories } from '../../lib/storefront'

test('catalog matches the requested groups and has no invented tasting information', () => {
  assert.deepEqual(categories.map((category) => category.value), ['blend', 'cafe', 'wholesale', 'traditional', 'nescafe'])
  assert.equal(products.length, 23)
  assert.equal(products.filter((p) => p.category === 'traditional').length, 2)
  assert.equal(products.filter((p) => p.cafeGroup === 'robusta').length, 5)
  assert.equal(products.filter((p) => p.cafeGroup === 'arabica').length, 3)
  assert.equal(products.filter((p) => p.category === 'cafe').length, 8)
  assert.deepEqual(cafeGroups.map((group) => group.value), ['robusta', 'arabica'])
  const blends = products.filter((p) => p.category === 'blend')
  assert.equal(blends.length, 6)
  assert.equal(blends.at(-1)!.id, 'cafe-blend-arabica-100')
  assert.equal(blends.filter((p) => p.name === '۱۰۰٪ عربیکا').length, 1)
  assert.equal(products.find((p) => p.id === 'cafe-ethiopia-lekempti')!.name, 'اتیوپی لکمپتی')
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
  assert.equal(productVariant(cafe, 2000, 'medium-dark'), null)
  assert.equal(productVariant(cafe, 250), null)
  for (const id of ['arabica-100', 'italian-roast-arabica-100']) {
    assert.equal(products.find((p) => p.id === id), undefined)
  }
  const wholesale = products.find((p) => p.category === 'wholesale')!
  assert.equal(products.filter(p => p.category === 'wholesale').length, 6)
  assert.deepEqual(wholesale.weights, [5000, 10000])
  assert.deepEqual(wholesale.grades, ['standard', 'vip'])
  assert.equal(productVariant(wholesale, 10000, 'medium', 'vip')!.weightGrams, 10000)
  assert.equal(productVariant(wholesale, 5000, 'medium')!.weightGrams, 5000)
  assert.equal(productVariant(wholesale, 250, 'medium'), null)
  assert.equal(findVariant('cafe-blend-robusta-100--500-dark-vip'), undefined)
  assert.equal(findVariant('arabica-80--250-default-standard'), undefined)
  assert.equal(findVariant('arabica-100--1000-default-standard'), undefined)
})
test('missing prices stay unknown rather than becoming free products', () => {
  assert.deepEqual(products.filter(p => startingPrice(p) === null).map(p => p.id), ['cafe-indonesia-ap1', 'cafe-uganda', 'nescafe'])
  assert.ok(variants.every(v => v.price === null || (Number.isSafeInteger(v.price) && v.price > 0)))
  const priced = { ...products.find((p) => p.category === 'traditional')!, prices: { '250-default-standard': 100_000, '500-default-standard': 0 } }
  assert.equal(productVariant(priced, 250)!.price, 100_000)
  assert.equal(productVariant(priced, 500)!.price, null)
})

test('retail prices scale from the supplied 500 g amounts for both roasts', () => {
  const prices: [string, number, number?][] = [
    ['cafe-blend-robusta-100', 2_800_000, 3_100_000],
    ['cafe-blend-robusta-80', 2_850_000, 2_950_000],
    ['cafe-blend-robusta-70', 2_950_000, 3_100_000],
    ['cafe-blend-robusta-50', 3_300_000, 3_800_000],
    ['cafe-blend-arabica-80', 3_450_000, 4_100_000],
    ['cafe-blend-arabica-100', 4_100_000, 5_140_000],
    ['cafe-vietnam-cherry-aa', 2_600_000],
    ['cafe-peaberry', 2_800_000],
    ['cafe-indonesia-ek', 3_250_000],
    ['cafe-colombia', 5_500_000],
    ['cafe-ethiopia-lekempti', 3_700_000],
    ['cafe-brazil-rio', 3_600_000],
    ['turkish-coffee', 2_750_000],
    ['armenian-coffee', 2_950_000],
  ]
  for (const [id, standard, vip] of prices) {
    const product = products.find(p => p.id === id)!
    for (const roast of product.roasts.length ? product.roasts : [undefined]) {
      for (const grade of product.grades) {
        const base = grade === 'vip' ? vip! : standard
        assert.equal(productVariant(product, 250, roast, grade)!.price, base / 2, id)
        assert.equal(productVariant(product, 500, roast, grade)!.price, base, id)
        assert.equal(productVariant(product, 1000, roast, grade)!.price, base * 2, id)
      }
    }
    assert.equal(startingPrice(product), standard / 2)
  }
})

test('wholesale uses the exact package prices without applying another discount', () => {
  const prices: [string, number, number, number, number][] = [
    ['wholesale-robusta-100', 11_500_000, 13_000_000, 22_310_000, 25_220_000],
    ['wholesale-robusta-80', 11_750_000, 12_500_000, 22_795_000, 24_250_000],
    ['wholesale-robusta-70', 12_250_000, 13_000_000, 23_765_000, 25_220_000],
    ['wholesale-robusta-50', 12_750_000, 13_750_000, 24_735_000, 26_675_000],
    ['wholesale-arabica-80', 15_000_000, 16_500_000, 29_100_000, 32_000_000],
    ['wholesale-arabica-100', 17_500_000, 24_500_000, 33_950_000, 47_530_000],
  ]
  for (const [id, standard5, vip5, standard10, vip10] of prices) {
    const product = products.find(p => p.id === id)!
    for (const roast of product.roasts) {
      assert.equal(productVariant(product, 5000, roast, 'standard')!.price, standard5, id)
      assert.equal(productVariant(product, 5000, roast, 'vip')!.price, vip5, id)
      assert.equal(productVariant(product, 10000, roast, 'standard')!.price, standard10, id)
      assert.equal(productVariant(product, 10000, roast, 'vip')!.price, vip10, id)
    }
  }
})
