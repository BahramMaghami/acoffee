import { variantKey, type Grade, type Roast } from './storefront'

export const maxPrice = 99_999_999_999_999
export type ProductDefaults = { weights: number[]; roasts: Roast[]; grades: Grade[]; wholesale: boolean }
export function categoryDefaults(slug: string): ProductDefaults {
  return {
    weights: slug === 'wholesale' ? [5000, 10000] : [250, 500, 1000],
    roasts: ['traditional', 'nescafe'].includes(slug) ? [] : ['medium', 'medium-dark'],
    grades: ['cafe', 'traditional', 'nescafe'].includes(slug) ? ['standard'] : ['standard', 'vip'],
    wholesale: slug === 'wholesale',
  }
}
export function moneyRatio(value: number, numerator: number, denominator: number) {
  if (![value, numerator, denominator].every(Number.isSafeInteger) || value < 0 || numerator < 0 || denominator <= 0) throw new RangeError('Invalid price')
  const divisor = BigInt(denominator)
  const amount = Number((BigInt(value) * BigInt(numerator) * BigInt(2) + divisor) / (divisor * BigInt(2)))
  if (amount > maxPrice || !Number.isSafeInteger(amount)) throw new RangeError('مبلغ بیش از حد مجاز است.')
  return amount
}
export type PricingInput = ProductDefaults & { basePrices: Partial<Record<Grade, number | null>>; overrides: Record<string, number | null> }
export function calculateProductPrices(input: PricingInput) {
  function price(weight: number, roast: Roast | undefined, grade: Grade): { price: number | null; manualPrice: boolean; discountPercent: number } {
    const key = variantKey(weight, roast, grade)
    if (Object.hasOwn(input.overrides, key)) return { price: input.overrides[key], manualPrice: true, discountPercent: 0 }
    if (input.wholesale && weight === 10000) {
      const base = input.basePrices[grade]
      const five = input.weights.includes(5000) ? price(5000, roast, grade).price : base == null ? null : moneyRatio(base, 5000, 1000)
      return { price: five === null ? null : moneyRatio(five, 194, 100), manualPrice: false, discountPercent: five === null ? 0 : 3 }
    }
    const base = input.basePrices[grade]
    return { price: base == null ? null : moneyRatio(base, weight, 1000), manualPrice: false, discountPercent: 0 }
  }
  return input.weights.flatMap(weightGrams => (input.roasts.length ? input.roasts : [undefined]).flatMap(roast => input.grades.map(grade => ({
    key: variantKey(weightGrams, roast, grade), weightGrams, roast: roast ?? 'default', grade, ...price(weightGrams, roast, grade),
  }))))
}
