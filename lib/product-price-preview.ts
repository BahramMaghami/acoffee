import { calculateProductPrices, type ProductDefaults } from './product-pricing'
import { moneyInputSchema, type ProductFormInput } from './validators/admin-products'
import { variantKey, type Roast } from './storefront'

// Enumerate options independently of price validation so invalid input remains editable.
export function productPricePreview(options: ProductDefaults, input: Pick<ProductFormInput, 'basePrices' | 'overrides'>) {
  const errors: Record<string, string> = {}
  const basePrices: Record<string, number | null> = {}
  const overrides: Record<string, number | null> = {}
  for (const [key, raw] of Object.entries(input.basePrices)) {
    const result = moneyInputSchema.safeParse(raw)
    basePrices[key] = result.success ? result.data : null
    if (!result.success) errors[`basePrices.${key}`] = result.error.issues[0].message
  }
  for (const [key, raw] of Object.entries(input.overrides)) {
    const result = moneyInputSchema.safeParse(raw)
    overrides[key] = result.success ? result.data : null
    if (!result.success) errors[`overrides.${key}`] = result.error.issues[0].message
  }
  const rows = calculateProductPrices({ ...options, basePrices: {}, overrides: {} }).map(option => {
    const manual = Object.hasOwn(overrides, option.key)
    const roast = option.roast === 'default' ? undefined : option.roast as Roast
    const fiveKey = variantKey(5000, roast, option.grade)
    const usesFive = options.wholesale && option.weightGrams === 10000 && options.weights.includes(5000)
    const source = manual ? `overrides.${option.key}`
      : usesFive && Object.hasOwn(overrides, fiveKey) ? `overrides.${fiveKey}` : `basePrices.${option.grade}`
    if (errors[source]) return { ...option, invalid: true }
    try {
      // Evaluate only this row and its 5kg dependency; an overflow in one row must
      // not hide every other row. Overrides retain the exact server precedence.
      const weights = usesFive && !manual ? [5000, 10000] : [option.weightGrams]
      const result = calculateProductPrices({ ...options, weights,
        roasts: roast ? [roast] : [], grades: [option.grade], basePrices, overrides,
      }).find(row => row.key === option.key)!
      const invalid = result.price !== null && result.price <= 0
      return { ...result, invalid }
    } catch {
      return { ...option, invalid: true }
    }
  })
  return { rows, errors }
}
