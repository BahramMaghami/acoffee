import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { safeAuthRedirect } from '@/lib/auth-redirect'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'ثبت‌نام' }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const destination = safeAuthRedirect(next)
  if (await getCurrentUser()) redirect(destination)
  return <>
    <span className="eyebrow">حساب کاربری آ</span>
    <h1 className="auth-title">ثبت‌نام</h1>
    <p className="auth-intro">برای ثبت سفارش، حساب کاربری بساز.</p>
    <RegisterForm destination={destination} />
    <p className="auth-switch">قبلاً ثبت‌نام کرده‌ای؟ <Link href={`/login?next=${encodeURIComponent(destination)}`}>وارد شو</Link></p>
  </>
}
