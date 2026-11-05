// Browser-safe presentation helpers. Live catalog data comes from lib/catalog.ts.
import type { GrindOption } from './order-options'
export const formatNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value)
export const formatPrice = (value: number) => formatNumber(value) + ' تومان'
export const formatWeight = (grams: number) => grams >= 1000 ? formatNumber(grams / 1000) + ' کیلوگرم' : formatNumber(grams) + ' گرم'
export const storefrontImages = { light: '/images/acoffee.jpg', dark: '/images/acoffee-cinematic.png' } as const
export const gradeLabels = { standard: 'Commercial Blend', vip: 'Premium Blend' } as const
export const roastOptions = [{ value: 'medium', label: 'مدیوم' }, { value: 'medium-dark', label: 'مدیوم-دارک' }] as const
export const cafeGroups = [{ value: 'robusta', label: 'قهوه‌های روبوستا' }, { value: 'arabica', label: 'قهوه‌های عربیکا' }] as const
export type Roast = (typeof roastOptions)[number]['value']
export type Grade = keyof typeof gradeLabels
export type CafeGroup = (typeof cafeGroups)[number]['value']
export type Category = string
export const cafeOffer = { minimumWeightGrams: 5000, contactUrl: '' }
export const maxCartQuantity = 100
export const defaultDescription = 'قهوهٔ مورد نظرت را انتخاب کن و وزن بسته را متناسب با مصرفت مشخص کن.'
export type StoreProduct = {
  id: string; slug: string; name: string; category: string; categoryLabel: string; wholesale: boolean
  cafeGroup?: CafeGroup; description: string; origin: string; imageUrl: string | null
  weights: readonly number[]; roasts: readonly Roast[]; grades: readonly Grade[]
  prices: Record<string, number | null>; skuIds: Record<string, string>
  availability: Record<string, boolean>; discounts: Record<string, number>
  originalPrices?: Record<string, number | null>
  grindOptions: Record<string, readonly GrindOption[]>
}
export const variantKey = (weight: number, roast?: Roast, grade: Grade = 'standard') => weight + '-' + (roast ?? 'default') + '-' + grade
export function productVariant(product: StoreProduct, weight = product.weights.includes(250) ? 250 : product.weights[0], roast?: Roast, grade: Grade = product.grades[0]) {
  if (!product.weights.includes(weight) || !product.grades.includes(grade) || (product.roasts.length ? !roast || !product.roasts.includes(roast) : roast !== undefined)) return null
  const key = variantKey(weight, roast, grade)
  if (!product.skuIds[key]) return null
  return { id: product.skuIds[key], product, weightGrams: weight, roast, grade, price: product.prices[key] ?? null,
    originalPrice: product.originalPrices?.[key] ?? null,
    isActive: product.availability[key] === true, discountPercent: product.discounts[key] ?? 0, grindOptions: product.grindOptions[key] ?? [],
    label: [formatWeight(weight), roastOptions.find(option => option.value === roast)?.label, product.grades.length > 1 ? gradeLabels[grade] : undefined].filter(Boolean).join(' · '),
  }
}
export type StoreVariant = NonNullable<ReturnType<typeof productVariant>>
export function productVariants(product: StoreProduct): StoreVariant[] {
  return product.weights.flatMap(weight => (product.roasts.length ? product.roasts : [undefined]).flatMap(roast => product.grades.flatMap(grade => {
    const variant = productVariant(product, weight, roast, grade)
    return variant ? [variant] : []
  })))
}
export function startingPrice(product: StoreProduct) {
  const prices = productVariants(product).filter(v => v.isActive && v.price !== null).map(v => v.price!)
  return prices.length ? Math.min(...prices) : null
}
export const hasVariantDiscount = (variant: StoreVariant) => variant.isActive && variant.price !== null && variant.price > 0 &&
  (variant.originalPrice !== null ? variant.originalPrice > variant.price : variant.discountPercent > 0)
export const discountedVariant = (product: StoreProduct) => productVariants(product).filter(hasVariantDiscount)
  .sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null
export const discountLabel = (percent: number) => (percent > 0 ? formatNumber(percent) + '٪' : 'کمتر از ۱٪') + ' تخفیف'
