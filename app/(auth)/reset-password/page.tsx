import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { resetTokenSchema } from '@/lib/validators/auth'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'تعیین رمز جدید', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await connection()
  const parsed = resetTokenSchema.safeParse((await searchParams).token)
  return <>
    <span className="eyebrow">حساب تو در آ</span><h1 className="auth-title">یک رمز تازه انتخاب کن.</h1>
    <p className="auth-intro">رمز جدید باید دست‌کم ۸ کاراکتر داشته باشد. پس از ذخیره، با رمز جدید وارد حسابت شو.</p>
    {parsed.success ? <ResetPasswordForm token={parsed.data} /> : <p className="form-error" role="alert">لینک بازیابی معتبر نیست. لینک تازه درخواست کن.</p>}
    <p className="auth-switch"><Link href="/forgot-password">درخواست لینک تازه</Link></p>
  </>
}
