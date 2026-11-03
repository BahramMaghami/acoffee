import { createHmac, timingSafeEqual, randomInt } from 'node:crypto'

export const signupOtpLifetimeMs = 120_000
export const signupOtpCooldownMs = 0
export const signupOtpMaxAttempts = 5
export function newSignupCode() { return String(randomInt(0, 1_000_000)).padStart(6, '0') }
export function signupCodeHash(secret: string, id: string, email: string, phone: string, code: string) {
  return createHmac('sha256', secret).update(JSON.stringify(['signup', id, email, phone, code])).digest('hex')
}
export function equalCodeHash(left: string, right: string) {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}
