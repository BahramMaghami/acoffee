import 'dotenv/config'
import { test, expect } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient, type OrderStatus, type PaymentStatus } from '../../generated/prisma/client'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('history requires authentication and preserves its destination', async ({ page }) => {
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/)
  await expect(page.getByTestId('order-history-card')).toHaveCount(0)
})

test.describe('private order history', () => {
  test.skip(process.env.ORDER_HISTORY_E2E !== '1', 'Requires Neon and temporary test users/orders.')
  test.setTimeout(180_000)
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
  test('history paginates five owned orders newest first with independent status states', async ({ page }, testInfo) => {
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    emails.push(`history-${randomUUID()}@acoffee.test`, `history-${randomUUID()}@acoffee.test`)
    const user = await db.user.create({ data: { name: 'خریدار آزمایشی', email: emails[0], passwordHash } })
    const other = await db.user.create({ data: { name: 'حساب دیگر', email: emails[1], passwordHash } })
    await page.goto('/orders')
    await page.getByLabel('ایمیل', { exact: true }).fill(emails[0])
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/orders$/, { timeout: 40000 })
    await expect(page.getByRole('heading', { name: 'هنوز سفارشی ثبت نکرده‌ای.' })).toBeVisible()
    const examples: { paymentStatus: PaymentStatus; status: OrderStatus; payment: string; shipping: string }[] = [
      { paymentStatus: 'UNPAID', status: 'PENDING', payment: 'پرداخت‌نشده', shipping: 'ارسال‌نشده' },
      { paymentStatus: 'PAID', status: 'PROCESSING', payment: 'پرداخت‌شده', shipping: 'در حال آماده‌سازی' },
      { paymentStatus: 'PAID', status: 'SHIPPED', payment: 'پرداخت‌شده', shipping: 'ارسال‌شده' },
      { paymentStatus: 'PAID', status: 'DELIVERED', payment: 'پرداخت‌شده', shipping: 'تحویل داده شده' },
      { paymentStatus: 'FAILED', status: 'CANCELLED', payment: 'پرداخت ناموفق', shipping: 'سفارش لغو شده' },
      { paymentStatus: 'REFUNDED', status: 'CANCELLED', payment: 'مبلغ بازپرداخت شده', shipping: 'سفارش لغو شده' },
    ]
    const base = { subtotal: 1000, total: 1000, recipientName: 'آزمایشی', phone: '09121234567', province: 'تهران', city: 'تهران', addressLine: 'نشانی موقت تست', postalCode: '1234567890' }
    await db.order.createMany({ data: Array.from({ length: 21 }, (_, index) => ({
      ...base, userId: user.id, paymentStatus: examples[index % examples.length].paymentStatus, status: examples[index % examples.length].status, createdAt: new Date(Date.now() - index * 60000),
    })) })
    const foreign = await db.order.create({ data: { ...base, userId: other.id }, select: { id: true } })
    const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, status: true, paymentStatus: true } })
    await db.orderItem.createMany({ data: orders.map(order => ({ orderId: order.id, productName: 'قهوهٔ آزمایشی', productSlug: 'history-test', weightGrams: 500, unitPrice: 1000, quantity: 1, lineTotal: 1000 })) })
    await page.goto('/')
    await page.getByRole('button', { name: /حساب کاربری/ }).click()
    await page.getByRole('menuitem', { name: 'سفارش‌های من', exact: true }).click()
    await expect(page).toHaveURL(/\/orders$/)
    const pagination = page.getByRole('navigation', { name: 'صفحه‌بندی سفارش‌ها' })
    await expect(pagination.getByRole('button', { name: 'قبلی', exact: true })).toBeDisabled()
    for (let index = 0; index < 5; index++) {
      const current = orders.slice(index * 5, (index + 1) * 5)
      await expect(page.getByTestId('order-history-card')).toHaveCount(current.length)
      for (let item = 0; item < current.length; item++) {
        const order = current[item]
        const example = examples.find(example => example.status === order.status && example.paymentStatus === order.paymentStatus)!
        const card = page.getByTestId('order-history-card').nth(item)
        await expect(card.getByRole('link')).toHaveAttribute('href', `/orders/${order.id}`)
        await expect(card.locator('dd').nth(0)).toHaveText(example.payment)
        await expect(card.locator('dd').nth(1)).toHaveText(example.shipping)
      }
      if (index < 4) {
        await pagination.getByRole('link', { name: 'بعدی', exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`page=${index + 2}$`))
      }
    }
    await expect(pagination.getByRole('button', { name: 'بعدی', exact: true })).toBeDisabled()
    await pagination.getByRole('link', { name: 'قبلی', exact: true }).click()
    await expect(page).toHaveURL(/page=4$/)
    await expect(page.getByTestId('order-history-card')).toHaveCount(5)
    await page.goto('/orders?page=999999')
    await expect(page.getByTestId('order-history-card')).toHaveCount(1)
    await page.goto(`/orders?page=-1&userId=${other.id}`)
    await expect(page.getByTestId('order-history-card')).toHaveCount(5)
    await expect(page.locator(`a[href="/orders/${foreign.id}"]`)).toHaveCount(0)
    await mkdir('artifacts/ui', { recursive: true })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { localStorage.setItem('acoffee:theme', theme); document.documentElement.dataset.theme = theme }, theme)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `artifacts/ui/order-history-${theme}-${testInfo.project.name}.png`, animations: 'disabled' })
    }
    expect((await page.goto(`/orders/${foreign.id}`))?.status()).toBe(404)
  })
})
