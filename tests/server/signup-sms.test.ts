import { test } from 'node:test'
import assert from 'node:assert/strict'
import Kavenegar from 'kavenegar'
import { sendSignupSms } from '../../lib/kavenegar'

test('official SDK lookup receives the template, rejects provider errors and sends nothing when unconfigured', async t => {
  const keys = ['KAVENEGAR_API_KEY', 'KAVENEGAR_OTP_TEMPLATE', 'OTP_SECRET'] as const
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, { KAVENEGAR_API_KEY: 'fake-test-key', KAVENEGAR_OTP_TEMPLATE: 'acoffeeverify', OTP_SECRET: 'x'.repeat(64) })
  let status: number | undefined = 200
  let calls = 0
  t.mock.method(Kavenegar, 'KavenegarApi', () => ({ VerifyLookup: (input: unknown, callback: (entries: unknown, status?: number) => void) => {
    calls++
    assert.deepEqual(input, { receptor: '09121234567', token: '012345', template: 'acoffeeverify', type: 'sms' })
    callback([], status)
  } }))
  try {
    await sendSignupSms('09121234567', '012345')
    status = 403; await assert.rejects(sendSignupSms('09121234567', '012345'), /SignupSmsRejected/)
    status = undefined; await assert.rejects(sendSignupSms('09121234567', '012345'), /SignupSmsRejected/)
    delete process.env.OTP_SECRET
    await assert.rejects(sendSignupSms('09121234567', '012345'), /SignupSmsNotConfigured/)
    assert.equal(calls, 3)
  } finally {
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key] }
  }
})
