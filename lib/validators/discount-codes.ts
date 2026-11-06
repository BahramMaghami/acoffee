import { z } from 'zod'
import { normalizeDigits } from '../digits'
import { maxPrice } from '../product-pricing'

const integerInput = (maximum: number) => z.string().max(30)
  .transform(value => normalizeDigits(value).replace(/[,٬\s]/g, ''))
  .refine(value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= maximum, `عدد صحیح مثبت و حداکثر ${maximum} وارد کن.`)
  .transform(Number)

export const discountCodeTextSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{10}$/, 'کد تخفیف ۱۰ حرفی معتبر وارد کن.')
export const createDiscountCodeSchema = z.object({
  type: z.enum(['PERCENT', 'FIXED']), value: integerInput(maxPrice),
  maxUsers: integerInput(100000), maxUsesPerUser: integerInput(10000), validDays: integerInput(3650),
}).superRefine((data, ctx) => {
  if (data.type === 'PERCENT' && data.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.' })
})
export const discountCodeStatusSchema = z.object({ id: z.string().cuid(), expectedUpdatedAt: z.iso.datetime(), isActive: z.boolean() })
export const applyDiscountCodeSchema = z.object({ code: discountCodeTextSchema, checkoutKey: z.uuid(), quoteHash: z.string().regex(/^[a-f0-9]{64}$/) })
export type DiscountCodeFormInput = z.input<typeof createDiscountCodeSchema>
