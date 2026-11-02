import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendRecoveryMail } from '../../lib/mail'
import { verifySmtp } from '../../lib/smtp'
import { startMailbox, recoveryToken, decodedMessage } from './mailbox'

test('recovery email reaches only the local SMTP sink and transport failures propagate', async () => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS', 'AUTH_URL'] as const
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const mailbox = await startMailbox(0)
  try {
    Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(mailbox.port), SMTP_FROM: 'آ <noreply@acoffee.test>', SMTP_USER: '', SMTP_PASS: '', AUTH_URL: 'http://127.0.0.1:3310' })
    const token = 'x'.repeat(43)
    await verifySmtp()
    assert.equal(mailbox.messages.length, 0, 'SMTP verification must not send a message')
    await sendRecoveryMail('test@acoffee.test', token)
    assert.equal(mailbox.messages.length, 1)
    assert.equal(mailbox.messages[0].recipient, 'test@acoffee.test')
    assert.equal(recoveryToken(mailbox.messages[0].raw), token)
    assert.match(decodedMessage(mailbox.messages[0].raw), /127\.0\.0\.1:3310\/reset-password/)
    mailbox.rejectDelivery(true)
    await assert.rejects(sendRecoveryMail('test@acoffee.test', token))
    assert.equal(mailbox.messages.length, 1)
    delete process.env.SMTP_HOST
    await assert.rejects(verifySmtp(), /MailNotConfigured/)
    await assert.rejects(sendRecoveryMail('test@acoffee.test', token), /MailNotConfigured/)
  } finally {
    await mailbox.close()
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
})
