import { z } from 'zod'
import { cartLineKey, grindValues, shippingValues } from '../order-options'

export const normalizeDigits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= '۰' ? 1776 : 1632)),
  )

export const addressSchema = z.object({
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
export const cartInputSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(200),
      quantity: z.number().int().min(1).max(100),
      grind: z.enum(grindValues, { error: 'آسیاب‌شده یا دانهٔ کامل را برای هر قهوه انتخاب کن.' }),
    }),
  )
  .min(1, 'سبد خرید خالی است.')
  .max(50)
  .refine(
    (items) =>
      new Set(items.map((item) => cartLineKey(item.productId, item.grind))).size === items.length,
    'سبد خرید تکراری یا نامعتبر است.',
  )
export const placeOrderSchema = z.object({
  checkoutKey: z.uuid(),
  quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  shippingMethod: z.enum(shippingValues, { error: 'روش دریافت سفارش را انتخاب کن.' }),
})
export const shippingSelectionSchema = placeOrderSchema.pick({ shippingMethod: true })
export type AddressInput = z.input<typeof addressSchema>
