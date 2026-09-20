export const formatNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value)
export const formatPrice = (value: number) => `${formatNumber(value)} تومان`

export const categories = [
  { value: 'blend', label: 'قهوه‌های بلند' },
  { value: 'cafe', label: 'قهوه‌های مخصوص کافه‌ها' },
  { value: 'traditional', label: 'قهوه‌های سنتی' },
] as const
export const cafeGroups = [
  { value: 'robusta', label: 'قهوه‌های روبوستا' },
  { value: 'arabica', label: 'قهوه‌های عربیکا' },
] as const
export const weightOptions = [100, 250, 500] as const
export const roastOptions = [
  { value: 'medium', label: 'مدیوم رست' },
  { value: 'dark', label: 'دارک رست' },
] as const
export type Roast = (typeof roastOptions)[number]['value']
export type Grade = 'standard' | 'vip'
export type Category = (typeof categories)[number]['value']
export type CafeGroup = (typeof cafeGroups)[number]['value']

export const showTraditionalCoffee = true
export const cafeOffer = { minimumWeightGrams: 5000, contactUrl: '' }
const description =
  'قهوهٔ مورد نظرت را انتخاب کن و وزن بسته را متناسب با مصرفت مشخص کن.'

export type StoreProduct = {
  id: string
  slug: string
  name: string
  category: Category
  cafeGroup?: CafeGroup
  description: string
  origin: string
  weights: readonly number[]
  roasts: readonly Roast[]
  grades: readonly Grade[]
  // Whole toman for each exact weight/roast/grade, filled when prices are supplied.
  prices: Record<string, number | null>
}
function coffee(
  id: string,
  name: string,
  category: Category,
  cafeGroup?: CafeGroup,
  vip = false,
): StoreProduct {
  return {
    id,
    slug: id,
    name,
    category,
    cafeGroup,
    description,
    origin: '',
    weights: weightOptions,
    roasts: category === 'cafe' || category === 'blend' ? ['medium', 'dark'] : [],
    grades: vip ? ['standard', 'vip'] : ['standard'],
    prices: {},
  }
}
const catalog: StoreProduct[] = [
  // These coffees keep their original weight-only options and SKUs.
  { ...coffee('arabica-100', 'قهوه ۱۰۰٪ عربیکا', 'blend'), roasts: [] },
  { ...coffee('italian-roast-arabica-100', 'قهوه ایتالین رست ۱۰۰٪ عربیکا', 'blend'), roasts: [] },
  coffee('cafe-vietnam-cherry-aa', 'ویتنام چری AA', 'cafe', 'robusta'),
  coffee('cafe-peaberry', 'پی بی', 'cafe', 'robusta'),
  coffee('cafe-indonesia-ap1', 'اندونزی AP1', 'cafe', 'robusta'),
  coffee('cafe-uganda', 'اوگاندا', 'cafe', 'robusta'),
  coffee('cafe-colombia', 'کلمبیا', 'cafe', 'arabica'),
  coffee('cafe-ethiopia-lekempti', 'اتیوپی لمکبتی', 'cafe', 'arabica'),
  coffee('cafe-brazil-rio', 'برزیل ریو', 'cafe', 'arabica'),
  // Preserve existing slugs and SKUs when moving products between categories.
  coffee('cafe-blend-robusta-100', '۱۰۰٪ روبوستا', 'blend', undefined, true),
  coffee('cafe-blend-robusta-80', '۸۰٪ روبوستا', 'blend', undefined, true),
  coffee('cafe-blend-robusta-70', '۷۰٪ روبوستا', 'blend', undefined, true),
  coffee('cafe-blend-robusta-50', '۵۰٪ روبوستا', 'blend', undefined, true),
  coffee('cafe-blend-arabica-80', '۸۰٪ عربیکا', 'blend', undefined, true),
  coffee('cafe-blend-arabica-100', '۱۰۰٪ عربیکا', 'blend', undefined, true),
  coffee('turkish-coffee', 'قهوه ترک', 'traditional'),
  coffee('armenian-coffee', 'قهوه ارمنی', 'traditional'),
]
export const products = catalog.filter(
  (product) => showTraditionalCoffee || product.category !== 'traditional',
)
export const visibleCategories = categories.filter(
  (category) => showTraditionalCoffee || category.value !== 'traditional',
)
export function variantKey(
  weightGrams: number,
  roast?: Roast,
  grade: Grade = 'standard',
) {
  return `${weightGrams}-${roast ?? 'default'}-${grade}`
}
export function productVariant(
  product: StoreProduct,
  weightGrams = 250,
  roast?: Roast,
  grade: Grade = 'standard',
) {
  if (!product.weights.includes(weightGrams) || !product.grades.includes(grade))
    return null
  if (
    product.roasts.length
      ? !roast || !product.roasts.includes(roast)
      : roast !== undefined
  )
    return null
  const key = variantKey(weightGrams, roast, grade)
  const price = product.prices[key] ?? null
  return {
    // The existing Product table supports one weight and price per SKU.
    id: `${product.id}--${key}`,
    product,
    weightGrams,
    roast,
    grade,
    price:
      price !== null && Number.isSafeInteger(price) && price > 0 ? price : null,
    label: [
      formatNumber(weightGrams) + ' گرم',
      roastOptions.find((option) => option.value === roast)?.label,
      grade === 'vip'
        ? 'VIP'
        : product.grades.length > 1
          ? 'معمولی'
          : undefined,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}
export const variants = products.flatMap((product) =>
  product.weights.flatMap((weight) =>
    (product.roasts.length ? product.roasts : [undefined]).flatMap((roast) =>
      product.grades.map(
        (grade) => productVariant(product, weight, roast, grade)!,
      ),
    ),
  ),
)
export type StoreVariant = (typeof variants)[number]
export const findVariant = (id: string) =>
  variants.find((variant) => variant.id === id)
export const maxCartQuantity = 100
export function startingPrice(product: StoreProduct) {
  const prices = variants
    .filter(
      (variant) => variant.product.id === product.id && variant.price !== null,
    )
    .map((variant) => variant.price!)
  return prices.length ? Math.min(...prices) : null
}
