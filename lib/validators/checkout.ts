import { z } from 'zod'
import { normalizeDigits } from '../digits'
import { discountCodeTextSchema } from './discount-codes'
import { cartLineKey, grindValues, grindDeviceValues, shippingValues, isValidPreparation } from '../order-options'

export { normalizeDigits } from '../digits'

export const addressSchema = z.object({
  alternatePhone: z.string().max(30).trim().transform(normalizeDigits).refine(value => value === '' || /^0\d{10}$/.test(value), 'شمارهٔ تماس جایگزین باید ۱۱ رقم و با صفر باشد.').optional(),
  province: z.string().trim().min(2, 'استان را وارد کن.').max(100),
  city: z.string().trim().min(2, 'شهر را وارد کن.').max(100),
  addressLine: z
    .string()
    .trim()
    .min(10, 'نشانی کامل، پلاک و واحد را وارد کن.')
    .max(500, 'نشانی بیش از حد طولانی است.'),
  postalCode: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .pipe(z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')),
  phone: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .pipe(
      z.string().regex(/^0\d{10}$/, 'شماره تماس ۱۱ رقمی را با صفر وارد کن.'),
    ),
})
export const grindSelectionSchema = z.object({
  grind: z.enum(grindValues, { error: 'آسیاب‌شده یا دانهٔ کامل را برای هر قهوه انتخاب کن.' }),
  grindDevice: z.enum(grindDeviceValues, { error: 'دستگاه آسیاب معتبر نیست.' }).nullable().default(null),
}).refine(value => isValidPreparation(value.grind, value.grindDevice), {
  path: ['grindDevice'], message: 'برای قهوهٔ آسیاب‌شده دستگاه را انتخاب کن؛ دانهٔ کامل نباید دستگاه داشته باشد.',
})

export const cartInputSchema = z
  .array(
    grindSelectionSchema.safeExtend({
      productId: z.string().min(1).max(200),
      quantity: z.number().int().min(1).max(100),
    }),
  )
  .min(1, 'سبد خرید خالی است.')
  .max(50)
  .refine(
    (items) =>
      new Set(items.map((item) => cartLineKey(item.productId, item.grind, item.grindDevice))).size === items.length,
    'سبد خرید تکراری یا نامعتبر است.',
  )
export const placeOrderSchema = z.object({
  discountCode: discountCodeTextSchema.optional(),
  checkoutKey: z.uuid(),
  quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  shippingMethod: z.enum(shippingValues, { error: 'روش دریافت سفارش را انتخاب کن.' }),
})
export const shippingSelectionSchema = placeOrderSchema.pick({ shippingMethod: true })
export type AddressInput = z.input<typeof addressSchema>
