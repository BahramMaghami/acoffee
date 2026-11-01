'use server'

import { AuthError, CredentialsSignin } from 'next-auth'
import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { signIn, signOut } from '@/auth'
import { getDb } from '@/lib/db'
import { loginSchema, registerSchema, profileSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import { consumeAuthAttempt } from '@/lib/auth-rate-limit'
import { logAuthError } from '@/lib/auth-error'
import { requireAdmin, getCurrentUser } from '@/lib/current-user'
import { adminUserMutationSchema } from '@/lib/validators/admin-users'
import { assertSignInRedirect } from '@/lib/auth-result'
import { lockCheckout } from '@/lib/checkout'
import { changePassword, issuePasswordReset, resetPassword, PasswordError } from '@/lib/password-recovery'
import { readMailConfig, sendRecoveryMail } from '@/lib/mail'

type AccountResult = { success: boolean; message: string }

export async function updateProfileAction(input: unknown): Promise<AccountResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, message: 'برای ویرایش حساب دوباره وارد شو.' }
    await getDb().$transaction(async tx => {
      await lockCheckout(tx, user.id)
      const updated = await tx.user.updateMany({ where: { id: user.id, sessionVersion: user.sessionVersion }, data: { name: parsed.data.name } })
      if (!updated.count) throw new PasswordError('نشستت معتبر نیست. دوباره وارد شو.')
      const address = await tx.address.findFirst({ where: { userId: user.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] })
      if (address) await tx.address.update({ where: { id: address.id }, data: { recipientName: parsed.data.name } })
    }, { maxWait: 10000, timeout: 30000 })
    revalidatePath('/', 'layout')
    return { success: true, message: 'نامت به‌روز شد.' }
  } catch (error) {
    logAuthError('profile', error)
    return { success: false, message: error instanceof PasswordError ? error.message : 'ذخیرهٔ نام انجام نشد. دوباره تلاش کن.' }
  }
}

export async function changePasswordAction(input: unknown): Promise<AccountResult> {
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, message: 'برای تغییر رمز دوباره وارد شو.' }
    if (!await consumeAuthAttempt(user.id, 'password-change')) return { success: false, message: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.' }
    await changePassword(user.id, user.sessionVersion, parsed.data.currentPassword, parsed.data.password)
  } catch (error) {
    logAuthError('change-password', error)
    return { success: false, message: error instanceof PasswordError ? error.message : 'تغییر رمز انجام نشد. دوباره تلاش کن.' }
  }
  // Revocation is already committed even if clearing this browser's cookie fails.
  await signOut({ redirect: false }).catch(error => logAuthError('password-signout', error))
  revalidatePath('/', 'layout')
  return { success: true, message: 'رمز تغییر کرد. با رمز جدید وارد شو.' }
}

export async function requestPasswordResetAction(input: unknown): Promise<AccountResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  if (!readMailConfig()) return { success: false, message: 'بازیابی رمز فعلاً در دسترس نیست. کمی بعد دوباره تلاش کن.' }
  const accepted = { success: true, message: 'درخواستت دریافت شد. اگر با این ایمیل حسابی داشته باشی، لینک بازیابی را دریافت می‌کنی. پوشهٔ هرزنامه را هم بررسی کن.' }
  try {
    if (!await consumeAuthAttempt(parsed.data.email, 'password-reset')) return accepted
    // Account lookup and SMTP run after the response. Existence, SMTP latency and
    // delivery errors cannot reveal whether the requested account is registered.
    after(async () => {
      let tokenHash: string | undefined
      try {
        const issued = await issuePasswordReset(parsed.data.email)
        if (!issued) return
        tokenHash = issued.tokenHash
        await sendRecoveryMail(parsed.data.email, issued.token)
      } catch (error) {
        logAuthError('recovery-delivery', error)
        if (tokenHash) await getDb().passwordResetToken.deleteMany({ where: { tokenHash } }).catch(cleanup => logAuthError('recovery-cleanup', cleanup))
      }
    })
    return accepted
  } catch (error) {
    logAuthError('recovery-request', error)
    return { success: false, message: 'درخواست ثبت نشد. ارتباط را بررسی کن و دوباره تلاش کن.' }
  }
}

export async function resetPasswordAction(input: unknown): Promise<AccountResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    await resetPassword(parsed.data.token, parsed.data.password)
  } catch (error) {
    logAuthError('reset-password', error)
    return { success: false, message: error instanceof PasswordError ? error.message : 'رمز تغییر نکرد. دوباره تلاش کن.' }
  }
  await signOut({ redirect: false }).catch(error => logAuthError('reset-signout', error))
  revalidatePath('/', 'layout')
  return { success: true, message: 'رمز جدید ذخیره شد. دوباره وارد حسابت شو.' }
}

export async function manageUserAction(input: unknown): Promise<{ success: boolean; message: string }> {
  const actor = await requireAdmin()
  const parsed = adminUserMutationSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'درخواست معتبر نیست.' }
  const data = parsed.data
  if (data.userId === actor.id)
    return { success: false, message: 'حذف یا تغییر نقش حساب خودت امکان‌پذیر نیست.' }
  try {
    const result = await getDb().$transaction(async (tx) => {
      // Recheck authorization inside the serializable transaction, including
      // concurrent attempts by two admins to remove each other's access.
      const current = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } })
      if (current?.role !== 'ADMIN') return { success: false, message: 'دسترسی مدیریت نداری.' }
      const target = await tx.user.findUnique({
        where: { id: data.userId }, select: { id: true, _count: { select: { orders: true } } },
      })
      if (!target) return { success: false, message: 'این کاربر دیگر وجود ندارد.' }
      if (data.operation === 'delete') {
        if (target._count.orders) return { success: false, message: 'این کاربر سفارش دارد؛ برای حفظ سوابق سفارش، حذف حساب ممکن نیست.' }
        await tx.user.delete({ where: { id: target.id } })
        return { success: true, message: 'کاربر حذف شد.' }
      }
      await tx.user.update({ where: { id: target.id }, data: { role: data.role } })
      return { success: true, message: 'نقش کاربر تغییر کرد.' }
    }, { isolationLevel: 'Serializable' })
    if (result.success) revalidatePath('/admin/users')
    return result
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code === 'P2003') return { success: false, message: 'کاربر سفارش دارد و قابل حذف نیست.' }
    if (code === 'P2034') return { success: false, message: 'اطلاعات هم‌زمان تغییر کرده است؛ دوباره تلاش کن.' }
    logAuthError('manage-user', error)
    return { success: false, message: 'تغییر کاربر انجام نشد. دوباره تلاش کن.' }
  }
}

type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; message: string }

export async function loginAction(
  input: unknown,
  destination?: string,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message }
  const redirectTo = safeAuthRedirect(destination)
  try {
    const result = await signIn('credentials', { ...parsed.data, redirect: false, redirectTo })
    assertSignInRedirect(result, redirectTo)
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === 'rate_limited') {
      return {
        success: false,
        message: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.',
      }
    }
    if (error instanceof AuthError && error.type === 'CredentialsSignin') {
      return { success: false, message: 'ایمیل یا رمز عبور درست نیست.' }
    }
    logAuthError('login', error)
    return {
      success: false,
      message: 'ورود فعلاً ممکن نیست. کمی بعد دوباره امتحان کن.',
    }
  }
  revalidatePath('/', 'layout')
  return { success: true, redirectTo }
}

export async function registerAction(
  input: unknown,
  destination?: string,
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message }
  const { name, email, password } = parsed.data
  const redirectTo = safeAuthRedirect(destination)

  try {
    if (!(await consumeAuthAttempt(email, 'register'))) {
      return {
        success: false,
        message:
          'تلاش‌های زیادی برای این ایمیل انجام شده؛ یک ساعت بعد دوباره امتحان کن.',
      }
    }
    const passwordHash = await hash(password, 12)
    await getDb().user.create({
      data: { name, email, passwordHash, role: 'CUSTOMER' },
      select: { id: true },
    })
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        message:
          'با این ایمیل نمی‌توان حساب جدید ساخت. اگر قبلاً ثبت‌نام کرده‌ای، وارد شو.',
      }
    }
    logAuthError('register', error)
    return {
      success: false,
      message: 'ساخت حساب فعلاً ممکن نیست. کمی بعد دوباره امتحان کن.',
    }
  }

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      redirectTo,
    })
    assertSignInRedirect(result, redirectTo)
  } catch (error) {
    logAuthError('register-signin', error)
    // Account creation succeeded; do not ask the user to register again.
    return {
      success: true,
      redirectTo: `/login?registered=1&next=${encodeURIComponent(redirectTo)}`,
    }
  }
  revalidatePath('/', 'layout')
  return { success: true, redirectTo }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' })
}
