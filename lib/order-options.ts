export const grindOptions = [
  { value: 'WHOLE_BEAN', label: 'دانهٔ کامل (آسیاب‌نشده)' },
  { value: 'GROUND', label: 'آسیاب‌شده' },
] as const
export type GrindOption = (typeof grindOptions)[number]['value']
export const grindValues = ['WHOLE_BEAN', 'GROUND'] as const
export const isGrindOption = (value: unknown): value is GrindOption => value === 'WHOLE_BEAN' || value === 'GROUND'
export const grindLabel = (value: string | null | undefined) => grindOptions.find(option => option.value === value)?.label ?? 'نوع آسیاب ثبت نشده'
export const grindDevices = [
  { value: 'MOKA_POT', label: 'موکاپات' },
  { value: 'HOME_ESPRESSO', label: 'اسپرسوساز خانگی' },
  { value: 'SEMI_COMMERCIAL', label: 'دستگاه نیمه‌صنعتی' },
  { value: 'COMMERCIAL', label: 'دستگاه صنعتی' },
] as const
export const grindDeviceValues = ['MOKA_POT', 'HOME_ESPRESSO', 'SEMI_COMMERCIAL', 'COMMERCIAL'] as const
export type GrindDevice = (typeof grindDeviceValues)[number]
export const isGrindDevice = (value: unknown): value is GrindDevice => grindDevices.some(option => option.value === value)
export const grindDeviceLabel = (value: string | null | undefined) => grindDevices.find(option => option.value === value)?.label ?? 'دستگاه ثبت نشده'
export const preparationLabel = (grind: string | null | undefined, device: string | null | undefined) =>
  grind === 'GROUND' ? `${grindLabel(grind)} · ${grindDeviceLabel(device)}` : grindLabel(grind)
export const isValidPreparation = (grind: unknown, device: unknown) =>
  grind === 'GROUND' ? isGrindDevice(device) : grind === 'WHOLE_BEAN' && device == null
export const cartLineKey = (productId: string, grind: GrindOption | null, grindDevice: GrindDevice | null = null) => JSON.stringify([productId, grind, grindDevice])

export const shippingMethods = [
  { value: 'POST', label: 'پست' },
  { value: 'TIPAX', label: 'تیپاکس' },
  { value: 'COURIER', label: 'پیک' },
] as const
export const shippingValues = ['POST', 'TIPAX', 'COURIER'] as const
export type ShippingMethod = (typeof shippingMethods)[number]['value']
export const isShippingMethod = (value: unknown): value is ShippingMethod => shippingMethods.some(option => option.value === value)
// Keep historical orders readable while rejecting pickup on all new orders.
export const shippingLabel = (value: string | null | undefined) => value === 'PICKUP' ? 'تحویل حضوری' : shippingMethods.find(option => option.value === value)?.label ?? 'روش ارسال ثبت نشده'
