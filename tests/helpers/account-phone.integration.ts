import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomInt, randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('first account phone: ownership, password, expiry, replay, races and shared phones', { skip: !hasTestDatabase, timeout: 240000 }, async t => {
  const urls = testDatabaseUrls()
  const keys = ['DATABASE_URL', 'DIRECT_URL', 'KAVENEGAR_API_KEY', 'KAVENEGAR_OTP_TEMPLATE', 'OTP_SECRET'] as const
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, { DATABASE_URL: urls.pooled, DIRECT_URL: urls.direct, KAVENEGAR_API_KEY: 'fake', KAVENEGAR_OTP_TEMPLATE: 'test', OTP_SECRET: 'x'.repeat(64) })
  const { getDb } = await import('../../lib/db')
  const { requestAccountPhoneOtp: request, verifyAccountPhoneOtp: verify } = await import('../../lib/account-phone')
  const db = getDb(), ids: string[] = [], rateKeys = new Set<string>()
  const digest = (s: string) => createHash('sha256').update(s).digest('hex')
  const passwordHash = await hash('test-password', 4)
  const create = async () => {
    const email = `phone-${randomUUID()}@acoffee.test`, phone = '09' + randomInt(100000000, 999999999)
    const user = await db.user.create({ data: { name: 'تست شماره', email, passwordHash }, select: { id: true, sessionVersion: true } })
    ids.push(user.id)
    rateKeys.add(digest(`phone-verify:${user.id}`))
    for (const identity of [`email-minute:${email}`, `email-hour:${email}`, `phone-minute:${phone}`, `phone-hour:${phone}`]) rateKeys.add(digest(`signup-otp:${identity}`))
    return { user, phone, email }
  }
  const unlock = async (email: string, phone: string) => db.authRateLimit.updateMany({ where: { key: { in: [`email-minute:${email}`, `phone-minute:${phone}`].map(v => digest('signup-otp:' + v)) } }, data: { resetsAt: new Date(0) } })
  const input = (phone: string) => ({ phone, currentPassword: 'test-password' })
  try {
    await t.test('password required; another account cannot use proof; only one concurrent consumption succeeds', async () => {
      const a = await create(), b = await create(); let code = '', sends = 0
      const send = async (_: string, c: string) => { code = c; sends++ }
      await assert.rejects(request(a.user, { ...input(a.phone), currentPassword: 'wrong' }, db, send), /رمز فعلی/)
      assert.equal(sends, 0)
      const challenge = await request(a.user, input(a.phone), db, send)
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: a.user.id } })).phone, null)
      const proof = { challengeId: challenge.challengeId, code }
      await assert.rejects(verify(b.user, proof, db))
      const attempts = await Promise.allSettled([verify(a.user, proof, db), verify(a.user, proof, db)])
      assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1)
      const saved = await db.user.findUniqueOrThrow({ where: { id: a.user.id } })
      assert.equal(saved.phone, a.phone); assert.ok(saved.phoneVerifiedAt)
      await assert.rejects(request(a.user, input(b.phone), db, send), /قبلاً/)
      // Shared phone remains legal across separate accounts.
      await unlock(b.email, a.phone)
      const next = await request(b.user, input(a.phone), db, send)
      await verify(b.user, { challengeId: next.challengeId, code }, db)
      assert.equal(await db.user.count({ where: { phone: a.phone } }), 2)
    })
    await t.test('expiry, resend and five incorrect attempts', async () => {
      const a = await create(); let code = ''
      const send = async (_: string, c: string) => { code = c }
      const first = await request(a.user, input(a.phone), db, send)
      await db.accountPhoneOtp.update({ where: { id: first.challengeId }, data: { expiresAt: new Date(0) } })
      await assert.rejects(verify(a.user, { challengeId: first.challengeId, code }, db))
      const second = await request(a.user, input(a.phone), db, send)
      await assert.rejects(verify(a.user, { challengeId: first.challengeId, code }, db))
      for (let i = 0; i < 5; i++) await assert.rejects(verify(a.user, { challengeId: second.challengeId, code: code === '000000' ? '999999' : '000000' }, db))
      assert.equal((await db.accountPhoneOtp.findUniqueOrThrow({ where: { id: second.challengeId } })).attempts, 5)
      await assert.rejects(verify(a.user, { challengeId: second.challengeId, code }, db))
    })
    await t.test('delivery failure is pending; password/session change revokes proof', async () => {
      const a = await create(); let code = ''
      await assert.rejects(request(a.user, input(a.phone), db, async (_, c) => { code = c; throw new Error('fake delivery failure') }))
      const pending = await db.accountPhoneOtp.findUniqueOrThrow({ where: { userId: a.user.id } })
      assert.equal(pending.sentAt, null)
      await assert.rejects(verify(a.user, { challengeId: pending.id, code }, db))
      await unlock(a.email, a.phone)
      const next = await request(a.user, input(a.phone), db, async (_, c) => { code = c })
      await db.user.update({ where: { id: a.user.id }, data: { sessionVersion: { increment: 1 } } })
      await assert.rejects(verify(a.user, { challengeId: next.challengeId, code }, db))
      await assert.rejects(verify({ ...a.user, sessionVersion: 1 }, { challengeId: next.challengeId, code }, db))
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: a.user.id } })).phoneVerifiedAt, null)
    })
    await t.test('eight wrong passwords throttle the next request without sending', async () => {
      const a = await create(); let sends = 0
      const send = async () => { sends++ }
      for (let i = 0; i < 8; i++) await assert.rejects(request(a.user, { ...input(a.phone), currentPassword: 'wrong' }, db, send))
      await assert.rejects(request(a.user, input(a.phone), db, send), /پانزده/)
      assert.equal(sends, 0)
    })
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } })
    await db.authRateLimit.deleteMany({ where: { key: { in: [...rateKeys] } } })
    await db.$disconnect()
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key] }
  }
})
