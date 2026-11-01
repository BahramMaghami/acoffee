import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { hash, compare } from 'bcryptjs'
import { getDb } from './db'
import { lockCheckout } from './checkout'

export const recoveryLifetimeMs = 30 * 60 * 1000
export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex')
export class PasswordError extends Error {}
const invalidLink = 'لینک بازیابی معتبر نیست یا منقضی شده است. لینک تازه درخواست کن.'

export async function issuePasswordReset(email: string, db = getDb()) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return null
  const token = randomBytes(32).toString('base64url')
  const tokenHash = tokenDigest(token)
  await db.$transaction(async tx => {
    await lockCheckout(tx, user.id)
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } })
    await tx.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + recoveryLifetimeMs) } })
  }, { maxWait: 10000, timeout: 30000 })
  return { token, tokenHash }
}

export async function resetPassword(token: string, password: string, db = getDb()) {
  const tokenHash = tokenDigest(token)
  const candidate = await db.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true, expiresAt: true } })
  if (!candidate || candidate.expiresAt.getTime() <= Date.now()) throw new PasswordError(invalidLink)
  const passwordHash = await hash(password, 12)
  return db.$transaction(async tx => {
    // Serialize resets and password changes on the same user. Check again after
    // acquiring the lock: a concurrent request may already have consumed it.
    await lockCheckout(tx, candidate.userId)
    const current = await tx.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!current || current.expiresAt.getTime() <= Date.now()) throw new PasswordError(invalidLink)
    const user = await tx.user.update({ where: { id: current.userId }, data: { passwordHash, sessionVersion: { increment: 1 } }, select: { email: true } })
    await tx.passwordResetToken.deleteMany({ where: { userId: current.userId } })
    return user
  }, { maxWait: 10000, timeout: 30000 })
}

export async function changePassword(userId: string, sessionVersion: number, currentPassword: string, password: string, db = getDb()) {
  const candidate = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true, sessionVersion: true } })
  if (!candidate || candidate.sessionVersion !== sessionVersion) throw new PasswordError('نشستت معتبر نیست. دوباره وارد شو.')
  if (!await compare(currentPassword, candidate.passwordHash)) throw new PasswordError('رمز فعلی درست نیست.')
  const passwordHash = await hash(password, 12)
  return db.$transaction(async tx => {
    await lockCheckout(tx, userId)
    const changed = await tx.user.updateMany({ where: { id: userId, sessionVersion, passwordHash: candidate.passwordHash }, data: { passwordHash, sessionVersion: { increment: 1 } } })
    if (changed.count !== 1) throw new PasswordError('رمز حساب هم‌زمان تغییر کرده است. دوباره وارد شو.')
    await tx.passwordResetToken.deleteMany({ where: { userId } })
  }, { maxWait: 10000, timeout: 30000 })
}
