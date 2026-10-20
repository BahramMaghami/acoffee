import 'dotenv/config'
import { test, expect, type Page } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'
import { dashboardWindow } from '../../lib/admin-metrics'
import { formatNumber, formatPrice } from '../../lib/storefront'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test('admin redirects guests to login with a safe admin destination', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/)
  await expect(page.getByRole('link', { name: 'پنل مدیریت', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('admin-revenue')).toHaveCount(0)
})

test.describe('Neon admin dashboard', () => {
  test.skip(process.env.ADMIN_E2E !== '1', 'Set ADMIN_E2E=1 to test admin access with temporary users and orders.')
  test.setTimeout(180_000)
  let db: PrismaClient
  const emails: string[] = []
  test.beforeAll(() => { db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) }) })
  test.afterAll(async () => {
    try {
      if (!emails.length) return
      const owners = { user: { email: { in: emails } } }
      await db.orderItem.deleteMany({ where: { order: owners } })
      await db.order.deleteMany({ where: owners })
      await db.user.deleteMany({ where: { email: { in: emails } } })
      await db.authRateLimit.deleteMany({ where: { key: { in: emails.map(email => createHash('sha256').update(`login:${email}`).digest('hex')) } } })
    } finally { await db.$disconnect() }
  })

  test('admin sees paid sales and charts; customers and revoked admins cannot read the dashboard', async ({ page, browser }, testInfo) => {
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    const adminEmail = `admin-e2e-${randomUUID()}@acoffee.test`
    const customerEmail = `admin-e2e-${randomUUID()}@acoffee.test`
    emails.push(adminEmail, customerEmail)
    const admin = await db.user.create({ data: { name: 'مدیر آزمایشی', email: adminEmail, passwordHash, role: 'ADMIN' } })
    await db.user.create({ data: { name: 'مشتری آزمایشی', email: customerEmail, passwordHash } })
    const now = new Date()
    const old = new Date(now.getTime() - 100 * 86400_000)
    const future = new Date(now.getTime() + 2 * 86400_000)
    const examples = [
      { paymentStatus: 'PAID' as const, paidAt: now, createdAt: now, total: 3000, quantity: 3 },
      { paymentStatus: 'PAID' as const, paidAt: now, createdAt: old, total: 4000, quantity: 4 },
      { paymentStatus: 'PAID' as const, paidAt: null, createdAt: now, total: 2000, quantity: 2 },
      { paymentStatus: 'UNPAID' as const, paidAt: null, createdAt: now, total: 9000, quantity: 9 },
      { paymentStatus: 'REFUNDED' as const, paidAt: now, createdAt: now, total: 7000, quantity: 7 },
      { paymentStatus: 'PAID' as const, paidAt: old, createdAt: now, total: 8000, quantity: 8 },
      { paymentStatus: 'PAID' as const, paidAt: future, createdAt: now, total: 6000, quantity: 6 },
    ]
    for (const example of examples) {
      await db.order.create({ data: {
        userId: admin.id, paymentStatus: example.paymentStatus, paidAt: example.paidAt, createdAt: example.createdAt,
        subtotal: example.total, total: example.total, recipientName: 'آزمایشی', phone: '09121234567',
        province: 'تهران', city: 'تهران', addressLine: 'نشانی موقت تست مدیریت', postalCode: '1234567890',
        items: { create: { productName: 'قهوه آزمایشی', productSlug: 'admin-test', weightGrams: 250, unitPrice: 1000, quantity: example.quantity, lineTotal: example.total } },
      } })
    }
    const window = dashboardWindow(30, now)
    const from = new Date(`${window.start}T00:00:00+03:30`)
    const to = new Date(`${window.endExclusive}T00:00:00+03:30`)
    const paid = (await db.order.findMany({ where: { paymentStatus: 'PAID' }, select: { total: true, paidAt: true, createdAt: true, items: { select: { quantity: true } } } }))
      .filter(order => (order.paidAt ?? order.createdAt) >= from && (order.paidAt ?? order.createdAt) < to)
    const revenue = paid.reduce((sum, order) => sum + Number(order.total), 0)
    const units = paid.reduce((sum, order) => sum + order.items.reduce((sum, item) => sum + item.quantity, 0), 0)

    async function login(target: Page, email: string) {
      await target.goto('http://127.0.0.1:3000/admin')
      await expect(target).toHaveURL(/\/login\?next=%2Fadmin$/)
      await target.getByLabel('ایمیل', { exact: true }).fill(email)
      await target.getByLabel('رمز عبور', { exact: true }).fill(password)
      await target.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    }

    const outsider = await browser.newContext()
    try {
      const customerPage = await outsider.newPage()
      await login(customerPage, customerEmail)
      await expect(customerPage).toHaveURL(/\/account$/, { timeout: 40000 })
      await expect(customerPage.getByRole('link', { name: 'پنل مدیریت', exact: true })).toHaveCount(0)
      await expect(customerPage.getByTestId('admin-revenue')).toHaveCount(0)
    } finally { await outsider.close() }

    await login(page, adminEmail)
    await expect(page).toHaveURL(/\/admin$/, { timeout: 40000 })
    await expect(page.getByRole('heading', { name: 'داشبورد فروش' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'پنل مدیریت', exact: true })).toBeVisible()
    await expect(page.getByTestId('admin-revenue')).toHaveText(formatPrice(revenue))
    await expect(page.getByTestId('admin-orders')).toHaveText(formatNumber(paid.length))
    await expect(page.getByTestId('admin-units')).toHaveText(formatNumber(units))
    await expect(page.getByTestId('admin-average')).toHaveText(formatPrice(Math.round(revenue / paid.length)))
    await expect(page.locator('.recharts-area')).toBeVisible()
    await page.getByRole('button', { name: 'تعداد سفارش', exact: true }).click()
    await expect(page.locator('.recharts-bar')).toBeVisible()
    await page.getByRole('button', { name: 'درآمد', exact: true }).click()
    await page.getByRole('link', { name: '۷ روز اخیر' }).click()
    await expect(page).toHaveURL(/\/admin\?days=7$/)
    await expect(page.getByRole('link', { name: '۷ روز اخیر' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('link', { name: '۹۰ روز اخیر' }).click()
    await expect(page).toHaveURL(/\/admin\?days=90$/)
    await expect(page.getByRole('link', { name: '۹۰ روز اخیر' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('link', { name: '۳۰ روز اخیر' }).click()
    await expect(page).toHaveURL(/\/admin\?days=30$/)
    await expect(page.getByRole('link', { name: '۳۰ روز اخیر' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('admin-revenue')).toHaveText(formatPrice(revenue))
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10000 })
    await mkdir('artifacts/ui', { recursive: true })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { localStorage.setItem('acoffee:theme', theme); document.documentElement.dataset.theme = theme }, theme)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `artifacts/ui/admin-${theme}-${testInfo.project.name}.png`, fullPage: true })
    }
    await db.user.update({ where: { id: admin.id }, data: { role: 'CUSTOMER' } })
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/account$/, { timeout: 40000 })
    await expect(page.getByTestId('admin-revenue')).toHaveCount(0)
  })
})
