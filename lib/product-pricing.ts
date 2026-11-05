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
export type DiscountInput = { originalPrice: number; mode: 'percent' | 'final'; value: number }
export function calculateDiscount(input: DiscountInput) {
  const { originalPrice, mode, value } = input
  if (!Number.isSafeInteger(originalPrice) || originalPrice <= 0 || originalPrice > maxPrice || !Number.isSafeInteger(value) || value <= 0) throw new RangeError('قیمت و تخفیف معتبر وارد کن.')
  if (mode === 'percent' && value >= 100) throw new RangeError('درصد تخفیف باید بین ۱ تا ۹۹ باشد.')
  const price = mode === 'percent' ? moneyRatio(originalPrice, 100 - value, 100) : value
  if (price <= 0 || price >= originalPrice) throw new RangeError('قیمت نهایی باید مثبت و کمتر از قیمت قبل از تخفیف باشد.')
  // Round down the advertised percentage; never overstate a discount after rounding.
  const discountPercent = Number(BigInt(originalPrice - price) * BigInt(100) / BigInt(originalPrice))
  return { price, originalPrice, discountPercent, manualPrice: true }
}
export type PricingInput = ProductDefaults & { basePrices: Partial<Record<Grade, number | null>>; overrides: Record<string, number | null>; discounts?: Record<string, DiscountInput | null> }
export function calculateProductPrices(input: PricingInput) {
  function price(weight: number, roast: Roast | undefined, grade: Grade): { price: number | null; originalPrice: number | null; manualPrice: boolean; discountPercent: number } {
    const key = variantKey(weight, roast, grade)
    const discount = input.discounts?.[key]
    if (discount) return calculateDiscount(discount)
    if (Object.hasOwn(input.overrides, key)) return { price: input.overrides[key], originalPrice: null, manualPrice: true, discountPercent: 0 }
    if (input.wholesale && weight === 10000) {
      const base = input.basePrices[grade]
      const five = input.weights.includes(5000) ? price(5000, roast, grade).price : base == null ? null : moneyRatio(base, 5000, 1000)
      const originalPrice = five === null ? null : moneyRatio(five, 2, 1)
      if (discount === null) return { price: originalPrice, originalPrice: null, manualPrice: true, discountPercent: 0 }
      const finalPrice = five === null ? null : moneyRatio(five, 194, 100)
      const discounted = originalPrice !== null && finalPrice !== null && finalPrice < originalPrice
      return { price: finalPrice, originalPrice: discounted ? originalPrice : null, manualPrice: false,
        discountPercent: discounted ? Number(BigInt(originalPrice - finalPrice) * BigInt(100) / BigInt(originalPrice)) : 0 }
    }
    const base = input.basePrices[grade]
    return { price: base == null ? null : moneyRatio(base, weight, 1000), originalPrice: null, manualPrice: false, discountPercent: 0 }
  }
  return input.weights.flatMap(weightGrams => (input.roasts.length ? input.roasts : [undefined]).flatMap(roast => input.grades.map(grade => ({
    key: variantKey(weightGrams, roast, grade), weightGrams, roast: roast ?? 'default', grade, ...price(weightGrams, roast, grade),
  }))))
}
