import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountPhoneHash } from '../../lib/account-phone-crypto'
import { accountPhoneRequestSchema, accountPhoneProofSchema } from '../../lib/validators/account-phone'
import { signupCodeHash } from '../../lib/signup-otp-crypto'

test('account phone normalizes Iranian numbers and code, requires password, strips browser identity', () => {
  const result = accountPhoneRequestSchema.parse({ phone: '+۹۸۹۱۲۱۲۳۴۵۶۷', currentPassword: 'password', userId: 'other', sessionVersion: 99 })
  assert.deepEqual(result, { phone: '09121234567', currentPassword: 'password' })
  assert.equal(accountPhoneRequestSchema.safeParse({ phone: '09121234567', currentPassword: '' }).success, false)
  assert.equal(accountPhoneRequestSchema.safeParse({ phone: '02112345678', currentPassword: 'password' }).success, false)
  assert.equal(accountPhoneProofSchema.parse({ challengeId: 'b9ec07be-a73b-47d8-b230-7247827c0d28', code: '۱۲۳۴۵۶', phone: 'other' }).code, '123456')
})

test('account phone proof is bound to purpose, user, session, phone and challenge', () => {
  const args = ['secret', 'challenge', 'user', 0, '09121234567', '123456'] as const
  const digest = accountPhoneHash(...args)
  assert.equal(digest.length, 64)
  assert.notEqual(digest, signupCodeHash(args[0], args[1], args[2], args[4], args[5]))
  assert.notEqual(digest, accountPhoneHash('secret', 'other', 'user', 0, args[4], args[5]))
  assert.notEqual(digest, accountPhoneHash('secret', 'challenge', 'other', 0, args[4], args[5]))
  assert.notEqual(digest, accountPhoneHash('secret', 'challenge', 'user', 1, args[4], args[5]))
  assert.notEqual(digest, accountPhoneHash('secret', 'challenge', 'user', 0, '09120000000', args[5]))
})
