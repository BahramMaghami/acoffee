import { z } from 'zod'
import { normalizeDigits } from './checkout'
import { maxPrice } from '../product-pricing'

const money = z.string().max(30).transform(value => normalizeDigits(value).replace(/[,٬\s]/g, ''))
  .refine(value => value === '' || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= maxPrice), 'قیمت باید عدد صحیح مثبت به تومان باشد.')
  .transform(value => value === '' ? null : Number(value))
export const priceInputSchema = z.object({
  basePrices: z.object({ standard: money, vip: money }),
  overrides: z.record(z.string().regex(/^\d+-(default|medium|medium-dark)-(standard|vip)$/), money)
    .refine(value => Object.keys(value).length <= 100, 'تعداد قیمت‌ها بیش از حد مجاز است.'),
})
export const productFormSchema = z.object({
  id: z.string().max(100).optional(), expectedUpdatedAt: z.iso.datetime().optional(),
  categoryId: z.string().max(100), newCategoryName: z.string().trim().max(100),
  name: z.string().trim().min(2, 'نام محصول را وارد کن.').max(100, 'نام حداکثر ۱۰۰ حرف باشد.'),
  weights: z.array(z.number().int().min(1).max(100_000)).max(20),
  roasts: z.array(z.enum(['medium', 'medium-dark'])).max(2), noRoast: z.boolean(),
  grades: z.array(z.enum(['standard', 'vip'])).max(2),
  ...priceInputSchema.shape,
  availability: z.record(z.string().max(100), z.boolean()).refine(value => Object.keys(value).length <= 100),
  isActive: z.boolean(), removeImage: z.boolean(), imagePublicId: z.string().max(250).nullable(), imageTicket: z.string().max(2000).optional(),
  confirmRemoved: z.boolean(),
}).superRefine((value, ctx) => {
  if (!value.categoryId && !value.newCategoryName) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'دسته را انتخاب یا ایجاد کن.' })
  if (value.newCategoryName && value.newCategoryName.length < 2) ctx.addIssue({ code: 'custom', path: ['newCategoryName'], message: 'نام دسته حداقل دو حرف باشد.' })
  if (value.id && !value.expectedUpdatedAt) ctx.addIssue({ code: 'custom', path: ['expectedUpdatedAt'], message: 'صفحه را تازه کن.' })
  if (new Set(value.weights).size !== value.weights.length) ctx.addIssue({ code: 'custom', path: ['weights'], message: 'وزن تکراری است.' })
  if (new Set(value.roasts).size !== value.roasts.length || new Set(value.grades).size !== value.grades.length) ctx.addIssue({ code: 'custom', path: ['grades'], message: 'رست یا نوع تکراری است.' })
})
export type ProductFormInput = z.input<typeof productFormSchema>
export const deleteProductSchema = z.object({ id: z.string().min(1).max(100), expectedUpdatedAt: z.iso.datetime() })
