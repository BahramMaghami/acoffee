import 'server-only'
import Kavenegar from 'kavenegar'

export function signupSmsConfig() {
  const apiKey = process.env.KAVENEGAR_API_KEY?.trim()
  const template = process.env.KAVENEGAR_OTP_TEMPLATE?.trim()
  const secret = process.env.OTP_SECRET
  return apiKey && template && secret && secret.length >= 32 ? { apiKey, template, secret } : null
}

export async function sendSignupSms(phone: string, code: string) {
  const config = signupSmsConfig()
  if (!config) throw new Error('SignupSmsNotConfigured')
  const api = Kavenegar.KavenegarApi({ apikey: config.apiKey })
  await new Promise<void>((resolve, reject) => {
    // The SDK does not expose its request for cancellation. Late replies cannot
    // enable the challenge after this promise has failed; never retry a send.
    const timer = setTimeout(() => reject(new Error('SignupSmsTimeout')), 10_000)
    try {
      api.VerifyLookup({ receptor: phone, token: code, template: config.template, type: 'sms' }, (_entries, status) => {
        clearTimeout(timer)
        if (status === 200) resolve()
        else reject(new Error('SignupSmsRejected'))
      })
    } catch {
      clearTimeout(timer)
      reject(new Error('SignupSmsUnavailable'))
    }
  })
}
