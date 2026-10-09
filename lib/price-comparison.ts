import { calculateBlendPrice, calculateTenKilogramPrice, calculateWeightPrice } from './pricing'
import { findVariant, variants } from './storefront'

const blendRatios = [
  ['robusta-100', 0], ['robusta-80', 20], ['robusta-70', 30],
  ['robusta-50', 50], ['arabica-80', 80], ['arabica-100', 100],
] as const

/** Read-only audit. This module never updates storefront prices or the database. */
export function compareBlendPrices() {
  const comparisons = blendRatios.flatMap(([blend, arabicaPercent]) =>
    (['cafe-blend', 'wholesale'] as const).flatMap(prefix => {
      const baseWeight = prefix === 'wholesale' ? 5000 : 500
      return variants.filter(variant => variant.product.id === `${prefix}-${blend}`).map(variant => {
        const suffix = `--${baseWeight}-${variant.roast}-${variant.grade}`
        const arabicaPrice = findVariant(`${prefix}-arabica-100${suffix}`)?.price
        const robustaPrice = findVariant(`${prefix}-robusta-100${suffix}`)?.price
        if (arabicaPrice == null || robustaPrice == null)
          throw new Error(`Missing pure-coffee base price for ${variant.id}`)
        const blendPrice = calculateBlendPrice({ arabicaPrice, robustaPrice, arabicaPercent })
        const calculatedPrice = prefix === 'wholesale' && variant.weightGrams === 10000
          ? calculateTenKilogramPrice(blendPrice)
          : calculateWeightPrice(blendPrice, baseWeight, variant.weightGrams)
        return {
          id: variant.id,
          name: variant.product.name,
          weightGrams: variant.weightGrams,
          roast: variant.roast,
          grade: variant.grade,
          currentPrice: variant.price,
          calculatedPrice,
          difference: variant.price === null ? null : calculatedPrice - variant.price,
          matches: calculatedPrice === variant.price,
        }
      })
    }),
  )
  return { allMatch: comparisons.length > 0 && comparisons.every(row => row.matches), comparisons }
}
