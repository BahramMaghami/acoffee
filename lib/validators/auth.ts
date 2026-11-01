import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase()
  .min(1, 'ایمیلت را وارد کن.')
  .max(254, 'ایمیل بیش از حد طولانی است.')
  .email('یک ایمیل معتبر وارد کن.')

const passwordSchema = z.string()
  .min(1, 'رمز عبورت را وارد کن.')
  .max(72, 'رمز عبور بیش از حد طولانی است.')
  .refine((value) => new TextEncoder().encode(value).length <= 72,
    'رمز عبور باید حداکثر ۷۲ بایت باشد؛ برای حروف فارسی از رمز کوتاه‌تری استفاده کن.')

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema })

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'نام باید دست‌کم ۲ حرف داشته باشد.').max(100, 'نام بیش از حد طولانی است.'),
  email: emailSchema,
  password: passwordSchema.refine((value) => value.length >= 8, 'رمز عبور باید دست‌کم ۸ کاراکتر داشته باشد.'),
  confirmPassword: z.string().min(1, 'رمز عبورت را تکرار کن.'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'تکرار رمز عبور یکسان نیست.', path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

const newPasswordSchema = passwordSchema.refine(value => value.length >= 8, 'رمز عبور باید دست‌کم ۸ کاراکتر داشته باشد.')
export const profileSchema = z.object({ name: registerSchema.shape.name })
export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'لینک بازیابی معتبر نیست.')
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, 'رمز عبورت را تکرار کن.'),
}).refine(v => v.password === v.confirmPassword, { message: 'تکرار رمز عبور یکسان نیست.', path: ['confirmPassword'] })
export const resetPasswordSchema = z.object({
  token: resetTokenSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, 'رمز عبورت را تکرار کن.'),
}).refine(v => v.password === v.confirmPassword, { message: 'تکرار رمز عبور یکسان نیست.', path: ['confirmPassword'] })
export type ProfileInput = z.infer<typeof profileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
