import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mobileSchema, signupDetailsSchema, verifiedSignupSchema } from '../../lib/validators/signup-otp'
import { equalCodeHash, newSignupCode, signupCodeHash } from '../../lib/signup-otp-crypto'

test('signup phones normalize Iranian international and Persian forms without becoming unique identities', () => {
  for (const input of ['۰۹۱۲۱۲۳۴۵۶۷', '+98 912 1234567', '00989121234567', '٠٩١٢١٢٣٤٥٦٧']) assert.equal(mobileSchema.parse(input), '09121234567')
  for (const input of ['02112345678', '0912123456', '+14155552671', 'test']) assert.equal(mobileSchema.safeParse(input).success, false)
})
test('final signup requires OTP proof; ordinary details cannot bypass verification', () => {
  const details = { name: 'تست آ', email: 'TEST@example.test', phone: '09121234567', password: 'test-password', confirmPassword: 'test-password' }
  assert.equal(signupDetailsSchema.safeParse(details).success, true)
  assert.equal(verifiedSignupSchema.safeParse(details).success, false)
  const final = verifiedSignupSchema.parse({ ...details, challengeId: 'b9ec07be-a73b-47d8-b230-7247827c0d28', code: '۰۱۲۳۴۵', role: 'ADMIN' })
  assert.equal(final.code, '012345'); assert.equal(final.email, 'test@example.test'); assert.equal('role' in final, false)
  assert.equal(verifiedSignupSchema.safeParse({ ...final, confirmPassword: 'other' }).success, false)
})
test('OTP hashes are bound to challenge, email and phone; six digit codes preserve zeroes', () => {
  const digest = signupCodeHash('test-secret', 'id', 'a@example.test', '09121234567', '000001')
  assert.equal(equalCodeHash(digest, digest), true)
  assert.equal(equalCodeHash(digest, signupCodeHash('test-secret', 'id', 'b@example.test', '09121234567', '000001')), false)
  assert.equal(equalCodeHash(digest, signupCodeHash('test-secret', 'other', 'a@example.test', '09121234567', '000001')), false)
  assert.equal(equalCodeHash(digest, signupCodeHash('test-secret', 'id', 'a@example.test', '09121234568', '000001')), false)
  assert.equal(equalCodeHash(digest, 'bad'), false)
  for (let n = 0; n < 50; n++) assert.match(newSignupCode(), /^\d{6}$/)
})
