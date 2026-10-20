import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/current-user'
import './admin.css'

export const metadata: Metadata = { title: 'پنل مدیریت', robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
