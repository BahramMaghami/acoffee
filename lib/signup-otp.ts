import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { getDb } from './db'
import { sendSignupSms, signupSmsConfig } from './kavenegar'
import { equalCodeHash, newSignupCode, signupCodeHash, signupOtpLifetimeMs, signupOtpCooldownMs, signupOtpMaxAttempts } from './signup-otp-crypto'
import { verifiedSignupSchema, signupOtpRequestSchema } from './validators/signup-otp'

export class SignupOtpError extends Error {}
const invalidCode = 'کد معتبر نیست یا منقضی شده است. کد را بررسی کن یا کد تازه بگیر.'

export async function requestSignupOtp(input: unknown, db = getDb(), send = sendSignupSms) {
  const { email, phone } = signupOtpRequestSchema.parse(input)
  const config = signupSmsConfig()
  if (!config) throw new SignupOtpError('تأیید پیامکی فعلاً در دسترس نیست. کمی بعد دوباره تلاش کن.')
  const id = randomUUID(), code = newSignupCode()
  const codeHash = signupCodeHash(config.secret, id, email, phone, code)
  const limits = [
    { identity: `email-minute:${email}`, seconds: 60, limit: 1 },
    { identity: `phone-minute:${phone}`, seconds: 60, limit: 1 },
    { identity: `email-hour:${email}`, seconds: 3600, limit: 3 },
    { identity: `phone-hour:${phone}`, seconds: 3600, limit: 3 },
    { identity: 'all-day', seconds: 86400, limit: 200 },
  ].map(item => ({ ...item, key: createHash('sha256').update(`signup-otp:${item.identity}`).digest('hex') }))
    .sort((a, b) => a.key.localeCompare(b.key))

  await db.$transaction(async tx => {
    // Deterministic row-lock ordering serializes resends, even for shared phones.
    for (const item of limits) {
      const [row] = await tx.$queryRaw<{ attempts: number }[]>`
        INSERT INTO "AuthRateLimit" ("key", "attempts", "resetsAt")
        VALUES (${item.key}, 1, CURRENT_TIMESTAMP + make_interval(secs => ${item.seconds}))
        ON CONFLICT ("key") DO UPDATE SET
          "attempts" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
          "resetsAt" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + make_interval(secs => ${item.seconds}) ELSE "AuthRateLimit"."resetsAt" END
        RETURNING "attempts"`
      if (!row || row.attempts > item.limit) throw new SignupOtpError(item.seconds === 60
        ? 'برای ارسال دوباره دست‌کم ۶۰ ثانیه صبر کن.'
        : 'سقف درخواست پیامک پر شده است. بعداً دوباره تلاش کن.')
    }
    if (await tx.user.findUnique({ where: { email }, select: { id: true } }))
      throw new SignupOtpError('با این ایمیل نمی‌توان حساب جدید ساخت. اگر قبلاً ثبت‌نام کرده‌ای، وارد شو.')
    const data = { id, phone, codeHash, attempts: 0, sentAt: null, consumedAt: null, expiresAt: new Date(Date.now() + signupOtpLifetimeMs), createdAt: new Date() }
    await tx.signupOtp.upsert({ where: { email }, create: { email, ...data }, update: data })
  }, { maxWait: 10000, timeout: 30000 })

  // External delivery is outside the transaction. PENDING challenges cannot log in.
  // Failure keeps sentAt null. Late SDK responses cannot reactivate this record.
  await send(phone, code)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + signupOtpLifetimeMs)
  const updated = await db.signupOtp.updateMany({ where: { id, sentAt: null, consumedAt: null }, data: { sentAt: now, expiresAt } })
  if (updated.count !== 1) throw new SignupOtpError('درخواست تغییر کرده است. دوباره کد بگیر.')
  return { challengeId: id, expiresAt: expiresAt.toISOString(), resendAt: new Date(now.getTime() + signupOtpCooldownMs).toISOString() }
}

export async function createUserWithSignupOtp(input: unknown, db = getDb()) {
  const data = verifiedSignupSchema.parse(input)
  const config = signupSmsConfig()
  if (!config) throw new SignupOtpError('تأیید پیامکی فعلاً در دسترس نیست.')
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "SignupOtp" WHERE "id" = ${data.challengeId} FOR UPDATE`
    const challenge = await tx.signupOtp.findUnique({ where: { id: data.challengeId } })
    if (!challenge || challenge.email !== data.email || challenge.phone !== data.phone || !challenge.sentAt || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= signupOtpMaxAttempts)
      return { error: invalidCode }
    const digest = signupCodeHash(config.secret, challenge.id, data.email, data.phone, data.code)
    if (!equalCodeHash(challenge.codeHash, digest)) {
      // Return, don't throw: incorrect attempts must commit.
      await tx.signupOtp.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } })
      return { error: invalidCode }
    }
    const passwordHash = await hash(data.password, 12)
    const user = await tx.user.create({ data: { name: data.name, email: data.email, phone: data.phone, phoneVerifiedAt: new Date(), passwordHash, role: 'CUSTOMER' }, select: { id: true } })
    await tx.signupOtp.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } })
    return { user }
  }, { maxWait: 10000, timeout: 30000 })
  if ('error' in result) throw new SignupOtpError(result.error)
  return result.user
}
