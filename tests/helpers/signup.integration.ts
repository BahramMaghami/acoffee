import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomInt, randomUUID } from 'node:crypto'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('signup OTP transactions, shared phones, resends and failure limits', { skip: !hasTestDatabase, timeout: 180000 }, async t => {
  const urls = testDatabaseUrls()
  const keys = ['DATABASE_URL', 'DIRECT_URL', 'KAVENEGAR_API_KEY', 'KAVENEGAR_OTP_TEMPLATE', 'OTP_SECRET'] as const
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, { DATABASE_URL: urls.pooled, DIRECT_URL: urls.direct, KAVENEGAR_API_KEY: 'fake', KAVENEGAR_OTP_TEMPLATE: 'test', OTP_SECRET: 'x'.repeat(64) })
  const { getDb } = await import('../../lib/db')
  const { requestSignupOtp, createUserWithSignupOtp } = await import('../../lib/signup-otp')
  const db = getDb()
  const emails: string[] = [], phones: string[] = []
  const identity = () => { const email = `signup-${randomUUID()}@acoffee.test`, phone = '09' + randomInt(100000000, 999999999); emails.push(email); phones.push(phone); return { email, phone } }
  const rateKey = (value: string) => createHash('sha256').update('signup-otp:' + value).digest('hex')
  const unlockCooldown = async (email: string, phone: string) => db.authRateLimit.updateMany({ where: { key: { in: [rateKey(`email-minute:${email}`), rateKey(`phone-minute:${phone}`)] } }, data: { resetsAt: new Date(0) } })
  const details = (data: { email: string; phone: string }, challengeId: string, code: string) => ({ ...data, challengeId, code, name: 'تست ثبت‌نام', password: 'test-password', confirmPassword: 'test-password' })
  try {
    await t.test('user is created only once, after verification; one phone can belong to two emails', async () => {
      const account = identity(); let code = ''
      const challenge = await requestSignupOtp(account, db, async (_phone, value) => { code = value })
      assert.equal(await db.user.count({ where: { email: account.email } }), 0)
      assert.equal('code' in challenge, false)
      const stored = await db.signupOtp.findUniqueOrThrow({ where: { id: challenge.challengeId } })
      assert.equal(stored.codeHash.length, 64); assert.notEqual(stored.codeHash, code)
      const input = details(account, challenge.challengeId, code)
      const results = await Promise.allSettled([createUserWithSignupOtp(input, db), createUserWithSignupOtp(input, db)])
      assert.equal(results.filter(item => item.status === 'fulfilled').length, 1)
      const user = await db.user.findUniqueOrThrow({ where: { email: account.email } })
      assert.equal(user.phone, account.phone); assert.ok(user.phoneVerifiedAt); assert.equal(user.role, 'CUSTOMER')
      const other = { ...identity(), phone: account.phone }
      await unlockCooldown(other.email, other.phone)
      const next = await requestSignupOtp(other, db, async (_phone, value) => { code = value })
      await createUserWithSignupOtp(details(other, next.challengeId, code), db)
      assert.equal(await db.user.count({ where: { phone: account.phone } }), 2)
    })
    await t.test('wrong identity, expired codes, resend and five failed attempts cannot bypass validation', async () => {
      const account = identity(); let code = ''
      const send = async (_phone: string, value: string) => { code = value }
      const first = await requestSignupOtp(account, db, send)
      await assert.rejects(requestSignupOtp(account, db, send))
      await assert.rejects(createUserWithSignupOtp({ ...details(account, first.challengeId, code), email: 'other@acoffee.test' }, db))
      await db.signupOtp.update({ where: { id: first.challengeId }, data: { expiresAt: new Date(0) } })
      await assert.rejects(createUserWithSignupOtp(details(account, first.challengeId, code), db))
      await unlockCooldown(account.email, account.phone)
      const second = await requestSignupOtp(account, db, send)
      await assert.rejects(createUserWithSignupOtp(details(account, first.challengeId, code), db))
      const wrong = code === '000000' ? '999999' : '000000'
      for (let i = 0; i < 5; i++) await assert.rejects(createUserWithSignupOtp(details(account, second.challengeId, wrong), db))
      assert.equal((await db.signupOtp.findUniqueOrThrow({ where: { id: second.challengeId } })).attempts, 5)
      await assert.rejects(createUserWithSignupOtp(details(account, second.challengeId, code), db))
      await unlockCooldown(account.email, account.phone)
      await requestSignupOtp(account, db, send)
      await unlockCooldown(account.email, account.phone)
      await assert.rejects(requestSignupOtp(account, db, send))
      assert.equal(await db.user.count({ where: { email: account.email } }), 0)
    })
    await t.test('delivery failure leaves the challenge unusable', async () => {
      const account = identity(); let code = ''
      await assert.rejects(requestSignupOtp(account, db, async (_phone, value) => { code = value; throw new Error('fake network failure') }))
      const challenge = await db.signupOtp.findUniqueOrThrow({ where: { email: account.email } })
      assert.equal(challenge.sentAt, null)
      await assert.rejects(createUserWithSignupOtp(details(account, challenge.id, code), db))
    })
  } finally {
    await db.user.deleteMany({ where: { email: { in: emails } } })
    await db.signupOtp.deleteMany({ where: { email: { in: emails } } })
    await db.authRateLimit.deleteMany({ where: { key: { in: [...emails.flatMap(value => [`email-minute:${value}`, `email-hour:${value}`]), ...phones.flatMap(value => [`phone-minute:${value}`, `phone-hour:${value}`])].map(rateKey) } } })
    await db.$disconnect()
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key] }
  }
})
