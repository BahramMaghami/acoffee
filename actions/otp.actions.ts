'use server'

import { signupOtpRequestSchema } from '@/lib/validators/signup-otp'
import { requestSignupOtp, SignupOtpError } from '@/lib/signup-otp'
import { logAuthError } from '@/lib/auth-error'
import { SmsRateLimitError } from '@/lib/sms-rate-limit'

export async function requestSignupOtpAction(input: unknown) {
  const parsed = signupOtpRequestSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: parsed.error.issues[0].message }
  try {
    return { success: true as const, ...(await requestSignupOtp(parsed.data)) }
  } catch (error) {
    logAuthError('signup-otp', error)
    return {
      success: false as const,
      message:
        error instanceof SignupOtpError || error instanceof SmsRateLimitError
          ? error.message
          : 'ارسال کد انجام نشد. کمی بعد دوباره تلاش کن.',
    }
  }
}
