import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { readMailConfig } from '@/lib/mail'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'بازیابی رمز عبور',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export const maxDuration = 60

export default async function ForgotPasswordPage() {
  await connection()
  return (
    <>
      <span className="eyebrow">حساب تو در آ</span>
      <h1 className="auth-title">رمزت را فراموش کرده‌ای؟</h1>
      <p className="auth-intro">
        ایمیل حسابت را وارد کن تا لینک تعیین رمز جدید را دریافت کنی.
      </p>
      <ForgotPasswordForm enabled={Boolean(readMailConfig())} />
      <p className="auth-switch">
        <Link href="/login">بازگشت به ورود</Link>
      </p>
    </>
  )
}
