import { z } from 'zod'
import { registerSchema, emailSchema } from './auth'
import { normalizeDigits } from './checkout'

export const mobileSchema = z.string().trim().transform(value => normalizeDigits(value)
  .replace(/[\s()-]/g, '').replace(/^(?:\+98|0098)/, '0'))
  .pipe(z.string().regex(/^09\d{9}$/, 'شمارهٔ موبایل ایران را وارد کن؛ مانند ۰۹۱۲۱۲۳۴۵۶۷.'))

export const signupDetailsSchema = registerSchema.safeExtend({ phone: mobileSchema })
export const signupOtpRequestSchema = z.object({ email: emailSchema, phone: mobileSchema })
export const signupOtpProofSchema = z.object({
  challengeId: z.uuid('دوباره کد تأیید درخواست کن.'),
  code: z.string().trim().transform(normalizeDigits).pipe(z.string().regex(/^\d{6}$/, 'کد تأیید باید ۶ رقم باشد.')),
})
export const verifiedSignupSchema = signupDetailsSchema.safeExtend(signupOtpProofSchema.shape)
export type SignupDetailsInput = z.input<typeof signupDetailsSchema>
