export const grindOptions = [
  { value: 'WHOLE_BEAN', label: 'دانهٔ کامل (آسیاب‌نشده)' },
  { value: 'GROUND', label: 'آسیاب‌شده' },
] as const
export type GrindOption = (typeof grindOptions)[number]['value']
export const grindValues = ['WHOLE_BEAN', 'GROUND'] as const
export const isGrindOption = (value: unknown): value is GrindOption => value === 'WHOLE_BEAN' || value === 'GROUND'
export const grindLabel = (value: string | null | undefined) => grindOptions.find(option => option.value === value)?.label ?? 'نوع آسیاب ثبت نشده'
export const cartLineKey = (productId: string, grind: GrindOption | null) => JSON.stringify([productId, grind])

export const shippingMethods = [
  { value: 'POST', label: 'پست' },
  { value: 'TIPAX', label: 'تیپاکس' },
  { value: 'COURIER', label: 'پیک' },
  { value: 'PICKUP', label: 'تحویل حضوری' },
] as const
export const shippingValues = ['POST', 'TIPAX', 'COURIER', 'PICKUP'] as const
export type ShippingMethod = (typeof shippingMethods)[number]['value']
export const shippingLabel = (value: string | null | undefined) => shippingMethods.find(option => option.value === value)?.label ?? 'روش ارسال ثبت نشده'
