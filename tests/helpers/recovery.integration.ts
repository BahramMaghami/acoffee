import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { hash, compare } from 'bcryptjs'
import { hasTestDatabase, testDatabaseUrls } from './test-database'
import { startMailbox, recoveryToken } from './mailbox'

test('password recovery transactions, rate limits and local SMTP', { skip: !hasTestDatabase, timeout: 180000 }, async t => {
  const urls = testDatabaseUrls()
  process.env.DATABASE_URL = urls.pooled
  process.env.DIRECT_URL = urls.direct
  const { getDb } = await import('../../lib/db')
  const { issuePasswordReset, resetPassword, changePassword, tokenDigest } = await import('../../lib/password-recovery')
  const { consumeAuthAttempt } = await import('../../lib/auth-rate-limit')
  const { sendRecoveryMail } = await import('../../lib/mail')
  const db = getDb()
  const email = `recovery-${randomUUID()}@acoffee.test`
  const user = await db.user.create({ data: { email, name: 'تست بازیابی', passwordHash: await hash('first-password', 12) } })
  const mailbox = await startMailbox(0)
  Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(mailbox.port), SMTP_FROM: 'test@acoffee.test', SMTP_USER: '', SMTP_PASS: '', AUTH_URL: 'http://127.0.0.1:3310' })
  try {
    await t.test('unknown users get no token; raw tokens are not persisted; GET-style lookup does not consume', async () => {
      assert.equal(await issuePasswordReset(`missing-${email}`), null)
      const issued = (await issuePasswordReset(email))!
      assert.equal(issued.token.length, 43)
      const stored = await db.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: issued.tokenHash } })
      assert.equal(stored.tokenHash, tokenDigest(issued.token))
      assert.equal(JSON.stringify(stored).includes(issued.token), false)
      assert.ok(stored.expiresAt.getTime() > Date.now() + 29 * 60000)
      await sendRecoveryMail(email, issued.token)
      assert.equal(recoveryToken(mailbox.messages.at(-1)!.raw), issued.token)
      assert.equal(await db.passwordResetToken.count({ where: { tokenHash: issued.tokenHash } }), 1)
    })
    await t.test('expired tokens fail, and only one concurrent reset succeeds', async () => {
      const expired = (await issuePasswordReset(email))!
      await db.passwordResetToken.update({ where: { tokenHash: expired.tokenHash }, data: { expiresAt: new Date(0) } })
      await assert.rejects(resetPassword(expired.token, 'new-password'))
      const issued = (await issuePasswordReset(email))!
      const results = await Promise.allSettled([resetPassword(issued.token, 'new-password'), resetPassword(issued.token, 'new-password')])
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
      await assert.rejects(resetPassword(issued.token, 'another-password'))
      const changed = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true, sessionVersion: true } })
      assert.equal(changed.sessionVersion, 1)
      assert.equal(await compare('new-password', changed.passwordHash), true)
      assert.equal(await db.passwordResetToken.count({ where: { userId: user.id } }), 0)
    })
    await t.test('changing a password requires the current password and invalidates reset links', async () => {
      await assert.rejects(changePassword(user.id, 1, 'wrong-password', 'final-password'))
      const issued = (await issuePasswordReset(email))!
      await changePassword(user.id, 1, 'new-password', 'final-password')
      await assert.rejects(resetPassword(issued.token, 'another-password'))
      await assert.rejects(changePassword(user.id, 1, 'final-password', 'another-password'))
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion, 2)
    })
    await t.test('limits are enforced and SMTP errors are observable without sending external mail', async () => {
      for (let n = 0; n < 3; n++) assert.equal(await consumeAuthAttempt(email, 'password-reset'), true)
      assert.equal(await consumeAuthAttempt(email, 'password-reset'), false)
      for (let n = 0; n < 8; n++) assert.equal(await consumeAuthAttempt(user.id, 'password-change'), true)
      assert.equal(await consumeAuthAttempt(user.id, 'password-change'), false)
      mailbox.rejectDelivery(true)
      await assert.rejects(sendRecoveryMail(email, 'a'.repeat(43)))
    })
  } finally {
    await mailbox.close()
    await db.user.delete({ where: { id: user.id } })
    await db.authRateLimit.deleteMany({ where: { key: { in: [tokenDigest(`password-reset:${email}`), tokenDigest(`password-change:${user.id}`)] } } })
    await db.$disconnect()
  }
})
