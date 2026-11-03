import { z } from 'zod'
import { loginSchema } from './auth'
import { mobileSchema, signupOtpProofSchema } from './signup-otp'

export const accountPhoneRequestSchema = z.object({
  phone: mobileSchema,
  currentPassword: loginSchema.shape.password,
})
export const accountPhoneProofSchema = signupOtpProofSchema
export type AccountPhoneInput = z.input<typeof accountPhoneRequestSchema>
export type AccountPhoneProof = z.input<typeof accountPhoneProofSchema>
