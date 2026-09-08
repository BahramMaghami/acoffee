import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'ورود به حساب' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; error?: string }>
}) {
  const params = await searchParams
  const destination = safeAuthRedirect(params.next)
  if (await getCurrentUser()) redirect(destination)
  return (
    <>
      <span className="eyebrow">به آ خوش آمدی</span>
      <h1 className="auth-title">خوش برگشتی.</h1>
      <p className="auth-intro">وارد حسابت شو؛ قهوه‌های خوب منتظرت هستند.</p>
      {params.registered === '1' && (
        <p className="auth-notice" role="status">
          حسابت ساخته شد. حالا با ایمیل و رمزت وارد شو.
        </p>
      )}
      {params.error && (
        <p className="form-error" role="alert">
          ورود انجام نشد. اطلاعاتت را بررسی کن و دوباره تلاش کن.
        </p>
      )}
      <LoginForm destination={destination} />
      <p className="auth-switch">
        هنوز حساب نداری؟{' '}
        <Link href={`/register?next=${encodeURIComponent(destination)}`}>
          ثبت‌نام کن
        </Link>
      </p>
    </>
  )
}
