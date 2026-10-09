import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateBlendPrice, calculateTenKilogramPrice, calculateWeightPrice } from '../../lib/pricing'
import { compareBlendPrices } from '../../lib/price-comparison'
import { variants } from '../../lib/storefront'

test('blend prices use the matching pure-coffee prices and preserve the endpoints', () => {
  const prices = { arabicaPrice: 4_100_000, robustaPrice: 2_800_000 }
  assert.equal(calculateBlendPrice({ ...prices, arabicaPercent: 80 }), 3_840_000)
  assert.equal(calculateBlendPrice({ ...prices, arabicaPercent: 20 }), 3_060_000)
  assert.equal(calculateBlendPrice({ ...prices, arabicaPercent: 0 }), 2_800_000)
  assert.equal(calculateBlendPrice({ ...prices, arabicaPercent: 100 }), 4_100_000)
  assert.equal(calculateBlendPrice({ arabicaPrice: 5_140_000, robustaPrice: 3_100_000, arabicaPercent: 80 }), 4_732_000)
})

test('weight conversion and ten kilogram discount use whole toman rounding', () => {
  assert.equal(calculateWeightPrice(3_840_000, 500, 250), 1_920_000)
  assert.equal(calculateWeightPrice(3_840_000, 500, 1000), 7_680_000)
  assert.equal(calculateWeightPrice(101, 500, 250), 51)
  assert.equal(calculateTenKilogramPrice(11_500_000), 22_310_000)
  assert.equal(calculateTenKilogramPrice(24_500_000), 47_530_000)
  const blendedFiveKg = calculateBlendPrice({ arabicaPrice: 17_500_000, robustaPrice: 11_500_000, arabicaPercent: 80 })
  assert.equal(blendedFiveKg, 16_300_000)
  assert.equal(calculateTenKilogramPrice(blendedFiveKg), 31_622_000)
})

test('invalid weights, prices, percentages and unsafe amounts are rejected', () => {
  for (const arabicaPercent of [-1, 101, NaN, 2.5])
    assert.throws(() => calculateBlendPrice({ arabicaPrice: 100, robustaPrice: 100, arabicaPercent }), RangeError)
  for (const amount of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER])
    assert.throws(() => calculateTenKilogramPrice(amount), RangeError)
  assert.throws(() => calculateWeightPrice(100, 0, 500), RangeError)
  assert.throws(() => calculateWeightPrice(100, 500, -1), RangeError)
})

test('comparison detects differences without replacing any catalog price', () => {
  const before = JSON.stringify(variants)
  const result = compareBlendPrices()
  assert.equal(result.comparisons.length, 120)
  assert.equal(result.allMatch, false)
  assert.equal(result.comparisons.filter(row => !row.matches).length, 80)
  const sample = result.comparisons.find(row => row.id === 'cafe-blend-arabica-80--500-medium-standard')!
  assert.equal(sample.currentPrice, 3_450_000)
  assert.equal(sample.calculatedPrice, 3_840_000)
  assert.equal(sample.difference, 390_000)
  assert.equal(JSON.stringify(variants), before)
})
