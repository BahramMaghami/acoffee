import 'dotenv/config'
import { test, expect } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('admin orders list and details require login', async ({ page }) => {
  for (const url of ['/admin/orders', '/admin/orders/not-an-order']) {
    await page.goto(url)
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/)
  }
})

test.describe('admin order management', () => {
  test.skip(process.env.ADMIN_ORDERS_E2E !== '1', 'Uses temporary users and orders in Neon.')
  test.setTimeout(240000)
  let db: PrismaClient
  const emails: string[] = []
  test.beforeAll(() => { db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) }) })
  test.afterAll(async () => {
    try {
      const owners = { user: { email: { in: emails } } }
      await db.orderItem.deleteMany({ where: { order: owners } })
      await db.order.deleteMany({ where: owners })
      await db.user.deleteMany({ where: { email: { in: emails } } })
      await db.authRateLimit.deleteMany({ where: { key: { in: emails.map(email => createHash('sha256').update(`login:${email}`).digest('hex')) } } })
    } finally { await db.$disconnect() }
  })
  test('admin confirms dates, reverses states, rejects stale edits and deletes only after confirmation', async ({ page, browser }, testInfo) => {
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    emails.push(`order-admin-${randomUUID()}@acoffee.test`, `order-buyer-${randomUUID()}@acoffee.test`)
    await db.user.create({ data: { name: 'مدیر آزمایشی', email: emails[0], passwordHash, role: 'ADMIN' } })
    const buyer = await db.user.create({ data: { name: 'خریدار آزمایشی', email: emails[1], passwordHash } })
    const order = await db.order.create({ data: {
      userId: buyer.id, recipientName: 'گیرندهٔ آزمایشی', phone: '09121234567', province: 'تهران', city: 'تهران', addressLine: 'نشانی موقت تست مدیریت', postalCode: '1234567890', subtotal: 3000, total: 3000,
      items: { create: { productName: 'قهوهٔ آزمایشی مدیریت', productSlug: 'admin-order-test', weightGrams: 500, quantity: 3, unitPrice: 1000, lineTotal: 3000 } },
    } })
    await page.goto('/login')
    await page.getByLabel('ایمیل', { exact: true }).fill(emails[0])
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 40000 })
    await page.goto('/admin/orders')
    await expect(page.getByRole('navigation', { name: 'بخش‌های مدیریت' }).getByRole('link', { name: 'سفارش‌ها' })).toHaveAttribute('aria-current', 'page')
    const card = page.getByTestId('admin-order-card').filter({ has: page.locator(`a[href="/admin/orders/${order.id}"]`) })
    await expect(card).toContainText('خریدار آزمایشی')
    await card.getByRole('link').click()
    const dialog = page.getByRole('dialog')
    await page.getByRole('button', { name: 'تأیید پرداخت', exact: true }).click()
    await dialog.getByRole('button', { name: 'انصراف' }).click()
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paidAt).toBeNull()
    await page.getByRole('button', { name: 'تأیید پرداخت', exact: true }).click()
    await dialog.getByRole('button', { name: 'ثبت تغییر' }).click()
    await expect(page.getByRole('button', { name: 'لغو تأیید پرداخت', exact: true })).toBeVisible({ timeout: 20000 })
    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(paid.paymentStatus).toBe('PAID')
    expect(paid.paidAt).not.toBeNull()
    await expect(page.locator('.admin-order-state time')).toHaveCount(1)
    await page.getByRole('button', { name: 'تأیید تحویل', exact: true }).click()
    await dialog.getByRole('button', { name: 'ثبت تغییر' }).click()
    await expect(page.getByRole('button', { name: 'لغو تأیید تحویل', exact: true })).toBeVisible({ timeout: 20000 })
    const delivered = await db.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(delivered.status).toBe('DELIVERED')
    expect(delivered.deliveredAt).not.toBeNull()
    expect(delivered.paidAt?.toISOString()).toBe(paid.paidAt?.toISOString())
    await expect(page.locator('.admin-order-state time')).toHaveCount(2)
    await page.reload()
    await expect(page.locator('.admin-order-state time')).toHaveCount(2)
    await mkdir('artifacts/ui', { recursive: true })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
      await page.screenshot({ path: `artifacts/ui/admin-order-${theme}-${testInfo.project.name}.png`, animations: 'disabled' })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'artifacts/ui/admin-order-mobile.png', animations: 'disabled' })
    for (const label of ['لغو تأیید پرداخت', 'لغو تأیید تحویل']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await dialog.getByRole('button', { name: 'ثبت تغییر' }).click()
      await expect(dialog).toHaveCount(0, { timeout: 20000 })
    }
    const reverted = await db.order.findUniqueOrThrow({ where: { id: order.id } })
    expect([reverted.paymentStatus, reverted.status, reverted.paidAt, reverted.deliveredAt]).toEqual(['UNPAID', 'PENDING', null, null])
    await db.order.update({ where: { id: order.id }, data: { status: 'PROCESSING' } })
    await page.getByRole('button', { name: 'حذف سفارش', exact: true }).click()
    await dialog.getByRole('button', { name: 'حذف دائمی سفارش' }).click()
    await expect(dialog.getByRole('alert')).toContainText('تغییر کرده', { timeout: 20000 })
    expect(await db.order.count({ where: { id: order.id } })).toBe(1)
    await dialog.getByRole('button', { name: 'انصراف' }).click()
    await page.reload()

    const customer = await browser.newContext()
    try {
      const customerPage = await customer.newPage()
      await customerPage.goto('http://127.0.0.1:3000/login')
      await customerPage.getByLabel('ایمیل', { exact: true }).fill(emails[1])
      await customerPage.getByLabel('رمز عبور', { exact: true }).fill(password)
      await customerPage.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
      await expect(customerPage).toHaveURL(/\/account$/, { timeout: 40000 })
      for (const url of ['/admin/orders', `/admin/orders/${order.id}`]) {
        await customerPage.goto(`http://127.0.0.1:3000${url}`)
        await expect(customerPage).toHaveURL(/\/account$/)
      }
    } finally { await customer.close() }
    await page.getByRole('button', { name: 'حذف سفارش', exact: true }).click()
    await dialog.getByRole('button', { name: 'انصراف' }).click()
    expect(await db.order.count({ where: { id: order.id } })).toBe(1)
    await page.getByRole('button', { name: 'حذف سفارش', exact: true }).click()
    await dialog.getByRole('button', { name: 'حذف دائمی سفارش' }).click()
    await expect(page).toHaveURL(/\/admin\/orders$/, { timeout: 20000 })
    expect(await db.order.count({ where: { id: order.id } })).toBe(0)
    expect(await db.orderItem.count({ where: { orderId: order.id } })).toBe(0)
    expect(await db.user.count({ where: { id: buyer.id } })).toBe(1)
  })
})
