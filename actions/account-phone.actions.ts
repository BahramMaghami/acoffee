'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { accountPhoneRequestSchema, accountPhoneProofSchema } from '@/lib/validators/account-phone'
import { requestAccountPhoneOtp, verifyAccountPhoneOtp, AccountPhoneError } from '@/lib/account-phone'
import { SmsRateLimitError } from '@/lib/sms-rate-limit'
import { logAuthError } from '@/lib/auth-error'

function failure(error: unknown) {
  logAuthError('account-phone', error)
  return { success: false as const, message: error instanceof AccountPhoneError || error instanceof SmsRateLimitError
    ? error.message : 'ارتباط برقرار نشد. اطلاعات فرم حفظ شده؛ دوباره تلاش کن.' }
}

export async function requestAccountPhoneOtpAction(input: unknown) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false as const, message: 'ابتدا وارد حسابت شو.' }
    const parsed = accountPhoneRequestSchema.safeParse(input)
    if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
    return { success: true as const, ...await requestAccountPhoneOtp(user, parsed.data) }
  } catch (error) { return failure(error) }
}

export async function verifyAccountPhoneOtpAction(input: unknown) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false as const, message: 'ابتدا وارد حسابت شو.' }
    const parsed = accountPhoneProofSchema.safeParse(input)
    if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
    const result = await verifyAccountPhoneOtp(user, parsed.data)
    revalidatePath('/account')
    revalidatePath('/admin/users')
    return { success: true as const, ...result }
  } catch (error) { return failure(error) }
}
