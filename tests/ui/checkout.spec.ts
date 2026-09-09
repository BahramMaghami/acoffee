import 'dotenv/config'
import { test, expect } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test('checkout requires login and preserves the destination', async ({ page }) => {
  await page.goto('/checkout/address')
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout%2Faddress/)
  await page.goto('/checkout/place-order')
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout%2Fplace-order/)
})

test.describe('Neon checkout', () => {
  test.skip(process.env.CHECKOUT_E2E !== '1', 'Set CHECKOUT_E2E=1 to test real checkout writes.')
  test.setTimeout(180_000)
  const identities: string[] = []
  let db: PrismaClient
  test.beforeAll(() => { db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) }) })
  test.afterAll(async () => {
    try {
      const users = await db.user.findMany({ where: { email: { in: identities } }, select: { id: true } })
      const ids = users.map((user) => user.id)
      await db.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } })
      await db.order.deleteMany({ where: { userId: { in: ids } } })
      await db.user.deleteMany({ where: { id: { in: ids } } })
      await db.authRateLimit.deleteMany({ where: { key: { in: identities.map((email) => createHash('sha256').update(`login:${email}`).digest('hex')) } } })
    } finally { await db.$disconnect() }
  })

  test('address is reused, orders persist with server prices, retries are idempotent and orders stay private', async ({ page, browser }, testInfo) => {
    const email = `checkout-e2e-${randomUUID()}@acoffee.test`
    const otherEmail = `checkout-e2e-${randomUUID()}@acoffee.test`
    identities.push(email, otherEmail)
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    const user = await db.user.create({ data: { name: 'خریدار آزمایشی آ', email, passwordHash } })
    const other = await db.user.create({ data: { name: 'حساب دوم آزمایشی', email: otherEmail, passwordHash } })
    const product = await db.product.findUniqueOrThrow({ where: { slug: 'daily-blend' } })
    expect(product.stock).toBeGreaterThanOrEqual(2)
    await page.goto('/shop/daily-blend')
    await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click()
    await page.goto('/cart')
    await page.getByRole('link', { name: 'ادامهٔ خرید', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?next=/)
    await page.getByLabel('ایمیل', { exact: true }).fill(email)
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/checkout\/address$/, { timeout: 30_000 })
    await page.getByLabel('استان', { exact: true }).fill('تهران')
    await page.getByLabel('شهر', { exact: true }).fill('تهران')
    await page.getByLabel('نشانی کامل', { exact: true }).fill('خیابان آزمایشی، کوچه آ، پلاک ۱۲، واحد ۳')
    await page.getByLabel('کد پستی', { exact: true }).fill('۱۲۳۴۵۶۷۸۹۰')
    await page.getByLabel('شماره تماس', { exact: true }).fill('۰۹۱۲۱۲۳۴۵۶۷')
    await page.getByRole('button', { name: 'ذخیره و بررسی سفارش' }).click()
    await expect(page).toHaveURL(/\/checkout\/place-order$/, { timeout: 40_000 })
    const address = await db.address.findFirstOrThrow({ where: { userId: user.id } })
    expect(address.postalCode).toBe('1234567890')
    expect(address.phone).toBe('09121234567')
    expect(await db.order.count({ where: { userId: user.id } })).toBe(0)

    // A stale review cannot create an order after stock requirements change.
    const cart = await db.cart.findUniqueOrThrow({ where: { userId: user.id } })
    await db.cartItem.updateMany({ where: { cartId: cart.id }, data: { quantity: product.stock + 1 } })
    await page.getByRole('button', { name: 'ثبت سفارش و ادامه' }).click()
    await expect(page.locator('.form-error')).toContainText('موجودی', { timeout: 30_000 })
    expect(await db.order.count({ where: { userId: user.id } })).toBe(0)
    await db.cartItem.updateMany({ where: { cartId: cart.id }, data: { quantity: 2 } })
    await page.getByRole('button', { name: 'ثبت سفارش و ادامه' }).click()
    await expect(page.locator('.form-error')).toContainText('تغییر کرده', { timeout: 30_000 })
    await page.reload()
    await page.screenshot({ path: `artifacts/ui/place-order-${testInfo.project.name}.png`, fullPage: true })
    const requestPromise = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/checkout/place-order'))
    await page.getByRole('button', { name: 'ثبت سفارش و ادامه' }).click()
    const request = await requestPromise
    await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+$/, { timeout: 40_000 })
    const order = await db.order.findFirstOrThrow({ where: { userId: user.id }, include: { items: true } })
    expect(order.paymentStatus).toBe('UNPAID')
    expect(order.status).toBe('PENDING')
    expect(order.shippingFeeFinalized).toBe(false)
    expect(Number(order.total)).toBe(Number(product.price) * 2)
    expect(order.items[0].quantity).toBe(2)
    expect(order.addressLine).toBe(address.addressLine)
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(product.stock)
    await expect(page.getByRole('button', { name: 'پرداخت آنلاین به‌زودی' })).toBeDisabled()

    const headers = { 'next-action': request.headers()['next-action'], 'content-type': request.headers()['content-type'], origin: 'http://127.0.0.1:3000' }
    const body = request.postData()!
    // Replay an identical POST twice; both must resolve to the existing order.
    const retries = await Promise.all([page.request.post(request.url(), { headers, data: body }), page.request.post(request.url(), { headers, data: body })])
    for (const response of retries) {
      expect(response.ok()).toBe(true)
      expect(await response.text()).toContain(`"orderId":"${order.id}"`)
    }
    expect(await db.order.count({ where: { userId: user.id } })).toBe(1)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('سفارش شمارهٔ')
    await page.screenshot({ path: `artifacts/ui/order-${testInfo.project.name}.png`, fullPage: true })
    await page.goto('/checkout/place-order')
    await expect(page).toHaveURL(new RegExp(`/orders/${order.id}$`))

    // The next checkout fetches the address from Neon; edits keep old snapshots.
    await page.goto('/checkout/address')
    await expect(page.getByLabel('کد پستی', { exact: true })).toHaveValue('1234567890')
    await expect(page.getByLabel('شماره تماس', { exact: true })).toHaveValue('09121234567')
    await page.getByLabel('نشانی کامل', { exact: true }).fill('نشانی جدید آزمایشی، پلاک ۴۲، واحد ۲')
    await page.getByRole('button', { name: 'ذخیره و بررسی سفارش' }).click()
    await expect(page).toHaveURL(/\/checkout\/place-order$/, { timeout: 40_000 })
    expect(await db.address.count({ where: { userId: user.id } })).toBe(1)
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).addressLine).toBe(address.addressLine)
    await page.goto('/account')
    await expect(page.getByRole('link', { name: new RegExp(`سفارش`) }).filter({ hasText: /در انتظار پرداخت/ })).toBeVisible()

    const outsider = await browser.newContext()
    try {
      const otherPage = await outsider.newPage()
      await otherPage.goto('http://127.0.0.1:3000/login')
      await otherPage.getByLabel('ایمیل', { exact: true }).fill(otherEmail)
      await otherPage.getByLabel('رمز عبور', { exact: true }).fill(password)
      await otherPage.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
      await expect(otherPage).toHaveURL(/\/account$/, { timeout: 30_000 })
      const response = await otherPage.goto(`http://127.0.0.1:3000/orders/${order.id}`)
      // Streaming Next responses may have status 200; private content must never render.
      expect(response?.status()).toBeLessThan(500)
      await expect(otherPage.getByText(address.addressLine, { exact: false })).toHaveCount(0)
      await outsider.request.post(request.url(), { headers, data: body })
      expect(await db.order.count({ where: { userId: other.id } })).toBe(0)
      expect(await db.order.count({ where: { userId: user.id } })).toBe(1)
    } finally { await outsider.close() }
  })
})
