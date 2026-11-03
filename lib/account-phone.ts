import 'server-only'
import { randomUUID } from 'node:crypto'
import { compare } from 'bcryptjs'
import { getDb } from './db'
import { consumeAuthAttempt } from './auth-rate-limit'
import { reserveSmsQuota } from './sms-rate-limit'
import { sendSignupSms, signupSmsConfig } from './kavenegar'
import { accountPhoneHash } from './account-phone-crypto'
import {
  equalCodeHash,
  newSignupCode,
  signupOtpLifetimeMs,
  signupOtpCooldownMs,
  signupOtpMaxAttempts,
} from './signup-otp-crypto'
import {
  accountPhoneRequestSchema,
  accountPhoneProofSchema,
} from './validators/account-phone'
import { lockCheckout } from './checkout'

export class AccountPhoneError extends Error {}
// This identity comes exclusively from the validated server session, never from form data.
type Identity = { id: string; sessionVersion: number }
const invalidCode =
  'کد معتبر نیست یا منقضی شده است. کد را بررسی کن یا کد تازه بگیر.'
const changedAccount =
  'وضعیت حساب تغییر کرده است. صفحه را تازه کن و دوباره وارد شو.'
function smsConfig() {
  const config = signupSmsConfig()
  if (!config)
    throw new AccountPhoneError(
      'تأیید پیامکی فعلاً در دسترس نیست. کمی بعد دوباره تلاش کن.',
    )
  return config
}

export async function requestAccountPhoneOtp(
  identity: Identity,
  input: unknown,
  db = getDb(),
  send = sendSignupSms,
) {
  const data = accountPhoneRequestSchema.parse(input)
  const config = smsConfig()
  if (!(await consumeAuthAttempt(identity.id, 'phone-verify', db)))
    throw new AccountPhoneError(
      'تعداد تلاش‌ها زیاد است. پانزده دقیقه بعد دوباره تلاش کن.',
    )
  const user = await db.user.findUnique({
    where: { id: identity.id },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      phoneVerifiedAt: true,
      sessionVersion: true,
    },
  })
  if (!user || user.sessionVersion !== identity.sessionVersion)
    throw new AccountPhoneError(changedAccount)
  if (user.phoneVerifiedAt)
    throw new AccountPhoneError('شمارهٔ این حساب قبلاً تأیید شده است.')
  if (!(await compare(data.currentPassword, user.passwordHash)))
    throw new AccountPhoneError('رمز فعلی درست نیست.')
  const id = randomUUID(),
    code = newSignupCode()
  const codeHash = accountPhoneHash(
    config.secret,
    id,
    user.id,
    user.sessionVersion,
    data.phone,
    code,
  )
  await db.$transaction(
    async (tx) => {
      await lockCheckout(tx, user.id)
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          phoneVerifiedAt: true,
          sessionVersion: true,
        },
      })
      if (
        !current ||
        current.sessionVersion !== identity.sessionVersion ||
        current.passwordHash !== user.passwordHash
      )
        throw new AccountPhoneError(changedAccount)
      if (current.phoneVerifiedAt)
        throw new AccountPhoneError('شمارهٔ این حساب قبلاً تأیید شده است.')
      await reserveSmsQuota(tx, current.email, data.phone)
      const challenge = {
        id,
        phone: data.phone,
        sessionVersion: current.sessionVersion,
        codeHash,
        attempts: 0,
        sentAt: null,
        consumedAt: null,
        expiresAt: new Date(Date.now() + signupOtpLifetimeMs),
        createdAt: new Date(),
      }
      await tx.accountPhoneOtp.upsert({
        where: { userId: current.id },
        create: { userId: current.id, ...challenge },
        update: challenge,
      })
    },
    { maxWait: 10000, timeout: 30000 },
  )
  // A failed or timed-out send never activates a challenge. No automatic SMS retry.
  await send(data.phone, code)
  const now = new Date(),
    expiresAt = new Date(now.getTime() + signupOtpLifetimeMs)
  const updated = await db.accountPhoneOtp.updateMany({
    where: { id, sentAt: null, consumedAt: null },
    data: { sentAt: now, expiresAt },
  })
  if (updated.count !== 1)
    throw new AccountPhoneError('درخواست تغییر کرده است. دوباره کد بگیر.')
  return {
    challengeId: id,
    expiresAt: expiresAt.toISOString(),
    resendAt: new Date(now.getTime() + signupOtpCooldownMs).toISOString(),
  }
}

export async function verifyAccountPhoneOtp(
  identity: Identity,
  input: unknown,
  db = getDb(),
) {
  const data = accountPhoneProofSchema.parse(input),
    config = smsConfig()
  const result = await db.$transaction(
    async (tx) => {
      // Same user lock as password changes; serialize verification, resends and session invalidation.
      await lockCheckout(tx, identity.id)
      const user = await tx.user.findUnique({ where: { id: identity.id } })
      if (!user || user.sessionVersion !== identity.sessionVersion)
        return { error: changedAccount }
      if (user.phoneVerifiedAt)
        return { error: 'شمارهٔ این حساب قبلاً تأیید شده است.' }
      const challenge = await tx.accountPhoneOtp.findUnique({
        where: { userId: user.id },
      })
      if (
        !challenge ||
        challenge.id !== data.challengeId ||
        challenge.sessionVersion !== identity.sessionVersion ||
        !challenge.sentAt ||
        challenge.consumedAt ||
        challenge.expiresAt.getTime() <= Date.now() ||
        challenge.attempts >= signupOtpMaxAttempts
      )
        return { error: invalidCode }
      const digest = accountPhoneHash(
        config.secret,
        challenge.id,
        user.id,
        identity.sessionVersion,
        challenge.phone,
        data.code,
      )
      if (!equalCodeHash(challenge.codeHash, digest)) {
        // Return rather than throw, so failed attempts commit.
        await tx.accountPhoneOtp.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        })
        return { error: invalidCode }
      }
      const verifiedAt = new Date()
      await tx.user.update({
        where: { id: user.id },
        data: { phone: challenge.phone, phoneVerifiedAt: verifiedAt },
      })
      await tx.accountPhoneOtp.update({
        where: { id: challenge.id },
        data: { consumedAt: verifiedAt },
      })
      return { phone: challenge.phone, verifiedAt: verifiedAt.toISOString() }
    },
    { maxWait: 10000, timeout: 30000 },
  )
  if ('error' in result) throw new AccountPhoneError(result.error)
  return result
}
