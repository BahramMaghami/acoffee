'use server'

import { AuthError, CredentialsSignin } from 'next-auth'
import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { signIn, signOut } from '@/auth'
import { getDb } from '@/lib/db'
import { loginSchema, registerSchema } from '@/lib/validators/auth'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import { consumeAuthAttempt } from '@/lib/auth-rate-limit'
import { logAuthError } from '@/lib/auth-error'

type AuthResult = { success: true; redirectTo: string } | { success: false; message: string }

export async function loginAction(input: unknown, destination?: string): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  const redirectTo = safeAuthRedirect(destination)
  try {
    await signIn('credentials', { ...parsed.data, redirect: false, redirectTo })
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === 'rate_limited') {
      return { success: false, message: 'تلاش‌های زیادی انجام شده؛ ۱۵ دقیقه بعد دوباره امتحان کن.' }
    }
    if (error instanceof AuthError && error.type === 'CredentialsSignin') {
      return { success: false, message: 'ایمیل یا رمز عبور درست نیست.' }
    }
    logAuthError('login', error)
    return { success: false, message: 'ورود فعلاً ممکن نیست. کمی بعد دوباره امتحان کن.' }
  }
  revalidatePath('/', 'layout')
  return { success: true, redirectTo }
}

export async function registerAction(input: unknown, destination?: string): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  const { name, email, password } = parsed.data
  const redirectTo = safeAuthRedirect(destination)

  try {
    if (!await consumeAuthAttempt(email, 'register')) {
      return { success: false, message: 'تلاش‌های زیادی برای این ایمیل انجام شده؛ یک ساعت بعد دوباره امتحان کن.' }
    }
    const passwordHash = await hash(password, 12)
    await getDb().user.create({
      data: { name, email, passwordHash, role: 'CUSTOMER' },
      select: { id: true },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, message: 'با این ایمیل نمی‌توان حساب جدید ساخت. اگر قبلاً ثبت‌نام کرده‌ای، وارد شو.' }
    }
    logAuthError('register', error)
    return { success: false, message: 'ساخت حساب فعلاً ممکن نیست. کمی بعد دوباره امتحان کن.' }
  }

  try {
    await signIn('credentials', { email, password, redirect: false, redirectTo })
  } catch {
    // Account creation succeeded; do not ask the user to register again.
    return { success: true, redirectTo: `/login?registered=1&next=${encodeURIComponent(redirectTo)}` }
  }
  revalidatePath('/', 'layout')
  return { success: true, redirectTo }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' })
}
