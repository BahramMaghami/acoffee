import { z } from 'zod'

const digits = (value: string) => value.replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.includes(digit) ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
export const dashboardMonthSchema = z.object({
  year: z.string().trim().transform(digits).pipe(z.string().regex(/^\d{4}$/, 'سال شمسی را چهاررقمی وارد کن.')).transform(Number).pipe(z.number().int().min(1300, 'سال باید بین ۱۳۰۰ و ۱۵۰۰ باشد.').max(1500, 'سال باید بین ۱۳۰۰ و ۱۵۰۰ باشد.')),
  month: z.string().transform(digits).pipe(z.string().regex(/^(?:[1-9]|1[0-2])$/, 'ماه را انتخاب کن.')).transform(Number),
})
