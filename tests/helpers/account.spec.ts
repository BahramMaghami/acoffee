import { test, expect, type Page } from '@playwright/test'
import { randomUUID, createHash } from 'node:crypto'
import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { hasTestDatabase, testDatabaseUrls } from './test-database'
import { startMailbox, recoveryToken } from './mailbox'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.describe('isolated account lifecycle', () => {
  test.skip(!hasTestDatabase || process.env.ACCOUNT_E2E !== '1', 'Requires an isolated, migrated test database and ACCOUNT_E2E=1.')
  test.setTimeout(300000)
  let db: PrismaClient
  let mailbox: Awaited<ReturnType<typeof startMailbox>>
  const email = `account-${randomUUID()}@acoffee.test`
  const otherEmail = `other-${email}`
  const password = 'test-password-before-change'
  test.beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: testDatabaseUrls().pooled, connectionTimeoutMillis: 15000 }) })
    mailbox = await startMailbox()
  })
  test.afterAll(async () => {
    if (mailbox) await mailbox.close()
    if (!db) return
    const users = await db.user.findMany({ where: { email: { in: [email, otherEmail] } }, select: { id: true } })
    const ids = users.map(u => u.id)
    await db.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } })
    await db.order.deleteMany({ where: { userId: { in: ids } } })
    await db.user.deleteMany({ where: { id: { in: ids } } })
    const keys = [email, otherEmail].flatMap(value => ['login', 'password-reset'].map(op => createHash('sha256').update(`${op}:${value}`).digest('hex')))
    keys.push(...ids.map(id => createHash('sha256').update(`password-change:${id}`).digest('hex')))
    await db.authRateLimit.deleteMany({ where: { key: { in: keys } } })
    await db.$disconnect()
  })
  async function login(page: Page, address: string, secret: string) {
    await page.goto('http://127.0.0.1:3310/login')
    await page.getByLabel('ایمیل', { exact: true }).fill(address)
    await page.getByLabel('رمز عبور', { exact: true }).fill(secret)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 40000 })
  }
  test('profile, address, password change and email recovery preserve ownership and revoke prior sessions', async ({ page, browser }) => {
    const passwordHash = await hash(password, 12)
    const user = await db.user.create({ data: { email, name: 'بهرام تست', passwordHash } })
    const other = await db.user.create({ data: { email: otherEmail, name: 'کاربر دیگر', passwordHash } })
    const oldOrder = await db.order.create({ data: { userId: user.id, subtotal: 10, total: 10, recipientName: user.name,
      province: 'تهران', city: 'تهران', addressLine: 'نشانی قبلی سفارش', postalCode: '1234567890', phone: '09121234567' } })
    await login(page, email, password)
    const profile = page.getByRole('form', { name: 'ویرایش مشخصات' })
    await profile.getByLabel('نام', { exact: true }).fill('آریا تست')
    const requestPromise = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/account'))
    await profile.getByRole('button', { name: 'ذخیرهٔ نام' }).click()
    const request = await requestPromise
    await expect(profile.getByRole('status')).toContainText('به‌روز شد')
    await expect(page.getByRole('button', { name: 'حساب کاربری آریا تست' })).toBeVisible()
    await expect(page.locator('.user-avatar')).toHaveText('آ')
    const outsider = await browser.newContext()
    try {
      const stranger = await outsider.newPage()
      await stranger.goto('http://127.0.0.1:3310/account')
      await expect(stranger).toHaveURL(/\/login\?next=/)
      const headers = { 'next-action': request.headers()['next-action'], 'content-type': request.headers()['content-type'], origin: 'http://127.0.0.1:3310' }
      await stranger.request.post(request.url(), { headers, data: request.postData()! })
      expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).name).toBe('کاربر دیگر')
      await login(stranger, otherEmail, password)
      await stranger.request.post(request.url(), { headers, data: request.postData()! })
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe('آریا تست')
      expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).name).toBe('آریا تست')
    } finally { await outsider.close() }
    await page.getByLabel('استان', { exact: true }).fill('فارس')
    await page.getByLabel('شهر', { exact: true }).fill('شیراز')
    await page.getByLabel('کد پستی').fill('۱۲۳۴۵۶۷۸۹۰')
    await page.getByLabel('شماره تماس').fill('۰۹۱۲۱۲۳۴۵۶۷')
    await page.getByLabel('نشانی کامل').fill('نشانی جدید، خیابان آزمون، پلاک ۵')
    await page.getByRole('button', { name: 'ذخیرهٔ آدرس', exact: true }).click()
    await expect(page.getByRole('form', { name: 'آدرس ارسال' }).getByRole('status')).toContainText('ذخیره شد')
    const address = await db.address.findFirstOrThrow({ where: { userId: user.id } })
    expect(address.recipientName).toBe('آریا تست')
    expect(address.postalCode).toBe('1234567890')
    expect((await db.order.findUniqueOrThrow({ where: { id: oldOrder.id } })).addressLine).toBe('نشانی قبلی سفارش')
    const sku = await db.product.findFirstOrThrow({ where: { catalogProductId: 'fixture-turkish-coffee', weightGrams: 250 } })
    await page.evaluate(sku => localStorage.setItem('acoffee:preview-cart:v1', JSON.stringify([{ productId: sku, quantity: 1, grind: 'GROUND' }])), sku.slug)
    await page.goto('/checkout/address')
    await expect(page.getByLabel('نشانی کامل')).toHaveValue(address.addressLine)
    await page.goto('/account')
    const previousSession = await browser.newContext({ storageState: await page.context().storageState() })
    try {
      const change = page.getByRole('form', { name: 'تغییر رمز عبور' })
      await change.getByLabel('رمز فعلی', { exact: true }).fill('incorrect-password')
      await change.getByLabel('رمز جدید', { exact: true }).fill('test-password-after-change')
      await change.getByLabel('تکرار رمز جدید', { exact: true }).fill('test-password-after-change')
      await change.getByRole('button', { name: 'ذخیرهٔ رمز جدید' }).click()
      await expect(change.getByRole('alert')).toContainText('رمز فعلی درست نیست')
      await change.getByLabel('رمز فعلی', { exact: true }).fill(password)
      await change.getByRole('button', { name: 'ذخیرهٔ رمز جدید' }).click()
      await expect(page).toHaveURL(/\/login\?passwordChanged=1$/, { timeout: 40000 })
      const stale = await previousSession.newPage()
      await stale.goto('http://127.0.0.1:3310/account')
      await expect(stale).toHaveURL(/\/login\?next=/)
    } finally { await previousSession.close() }
    await login(page, email, 'test-password-after-change')
    const beforeReset = await browser.newContext({ storageState: await page.context().storageState() })
    try {
      await page.goto('/forgot-password')
      await page.getByLabel('ایمیل حساب').fill(email)
      await page.getByRole('button', { name: 'درخواست لینک بازیابی' }).click()
      await expect(page.getByRole('status')).toContainText('درخواستت دریافت شد')
      await expect.poll(() => mailbox.messages.length, { timeout: 40000 }).toBe(1)
      const token = recoveryToken(mailbox.messages[0].raw)
      await page.goto(`/reset-password?token=${token}`)
      const tokenHash = createHash('sha256').update(token).digest('hex')
      expect(await db.passwordResetToken.count({ where: { tokenHash } })).toBe(1)
      await page.getByLabel('رمز جدید', { exact: true }).fill('test-password-after-reset')
      await page.getByLabel('تکرار رمز جدید', { exact: true }).fill('test-password-after-reset')
      await page.getByRole('button', { name: 'ذخیرهٔ رمز جدید' }).click()
      await expect(page).toHaveURL(/\/login\?passwordChanged=1$/, { timeout: 40000 })
      const stale = await beforeReset.newPage()
      await stale.goto('http://127.0.0.1:3310/account')
      await expect(stale).toHaveURL(/\/login\?next=/)
      const changed = await db.user.findUniqueOrThrow({ where: { id: user.id } })
      expect(await compare('test-password-after-reset', changed.passwordHash)).toBe(true)
      expect(changed.sessionVersion).toBe(2)
      await login(page, email, 'test-password-after-reset')
    } finally { await beforeReset.close() }
  })
})
