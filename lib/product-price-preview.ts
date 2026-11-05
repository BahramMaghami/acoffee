import { calculateProductPrices, type ProductDefaults, type DiscountInput } from './product-pricing'
import { moneyInputSchema, discountInputSchema, type ProductFormInput } from './validators/admin-products'
import { variantKey, type Roast } from './storefront'

// Enumerate options independently of price validation so invalid input remains editable.
export function productPricePreview(options: ProductDefaults, input: Pick<ProductFormInput, 'basePrices' | 'overrides' | 'discounts'>) {
  const errors: Record<string, string> = {}
  const basePrices: Record<string, number | null> = {}
  const overrides: Record<string, number | null> = {}
  const discounts: Record<string, DiscountInput | null> = {}
  for (const [key, raw] of Object.entries(input.discounts ?? {})) {
    if (raw === null) { discounts[key] = null; continue }
    const result = discountInputSchema.safeParse(raw)
    if (result.success) discounts[key] = result.data
    else for (const issue of result.error.issues) errors[`discounts.${key}.${String(issue.path[0] ?? 'value')}`] = issue.message
  }
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
    const manual = Boolean(input.discounts?.[option.key]) || Object.hasOwn(overrides, option.key)
    const roast = option.roast === 'default' ? undefined : option.roast as Roast
    const fiveKey = variantKey(5000, roast, option.grade)
    const usesFive = options.wholesale && option.weightGrams === 10000 && options.weights.includes(5000)
    const sourceFor = (key: string) => input.discounts?.[key] ? `discounts.${key}.`
      : Object.hasOwn(overrides, key) ? `overrides.${key}` : `basePrices.${option.grade}`
    const source = sourceFor(usesFive && !manual ? fiveKey : option.key)
    if (Object.keys(errors).some(key => source.endsWith('.') ? key.startsWith(source) : key === source)) return { ...option, invalid: true }
    try {
      // Evaluate only this row and its 5kg dependency; an overflow in one row must
      // not hide every other row. Overrides retain the exact server precedence.
      const weights = usesFive && !manual ? [5000, 10000] : [option.weightGrams]
      const result = calculateProductPrices({ ...options, weights,
        roasts: roast ? [roast] : [], grades: [option.grade], basePrices, overrides, discounts,
      }).find(row => row.key === option.key)!
      const invalid = result.price !== null && result.price <= 0
      return { ...result, invalid }
    } catch {
      return { ...option, invalid: true }
    }
  })
  return { rows, errors }
}
