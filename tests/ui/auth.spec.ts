import 'dotenv/config'
import { expect, test } from '@playwright/test'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import { compare } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'

// Never record network traces containing real credentials.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test('guest can open authentication pages and account requires login', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'ورود/ثبت‌نام', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'خوش برگشتی.' })).toBeVisible()
  await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
  await expect(page.getByText('ایمیلت را وارد کن.')).toBeVisible()
  await expect(page.getByText('رمز عبورت را وارد کن.')).toBeVisible()
  await page.getByRole('link', { name: 'ثبت‌نام کن', exact: true }).click()
  await expect(page).toHaveURL(/\/register\?/)
  await page.getByLabel('نام و نام خانوادگی', { exact: true }).fill('کاربر آ')
  await page.getByLabel('ایمیل', { exact: true }).fill('form-preview@acoffee.test')
  await page.getByLabel('رمز عبور', { exact: true }).fill('example-password')
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('different-password')
  await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click()
  await expect(page.getByText('تکرار رمز عبور یکسان نیست.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.goto('/login?next=https://example.org')
  await expect(page.getByRole('link', { name: 'ثبت‌نام کن' })).toHaveAttribute('href', '/register?next=%2Faccount')
  await mkdir('artifacts/ui', { recursive: true })
  await page.screenshot({ path: `artifacts/ui/login-${testInfo.project.name}.png`, fullPage: true })
})

test.describe('Neon authentication', () => {
  test.skip(process.env.AUTH_E2E !== '1', 'Set AUTH_E2E=1 to test real Neon authentication.')
  test.setTimeout(120_000)

  let db: PrismaClient
  const emails: string[] = []
  test.beforeAll(() => {
    db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) })
  })
  test.afterAll(async () => {
    if (!db) return
    try {
      // Only rows belonging to the exact randomly generated test identities.
      if (emails.length) {
        await db.user.deleteMany({ where: { email: { in: emails } } })
        const keys = emails.flatMap((email) => ['login', 'register'].map((operation) => createHash('sha256').update(`${operation}:${email}`).digest('hex')))
        await db.authRateLimit.deleteMany({ where: { key: { in: keys } } })
      }
    } finally { await db.$disconnect() }
  })

  test('registration, encrypted 14-day session, signout and credentials login work', async ({ page, browser }, testInfo) => {
    const email = `auth-e2e-${randomUUID()}@acoffee.test`
    const password = randomBytes(20).toString('base64url')
    emails.push(email)
    await page.goto('/register')
    await page.getByLabel('نام و نام خانوادگی', { exact: true }).fill('کاربر آزمایشی آ')
    await page.getByLabel('ایمیل', { exact: true }).fill(email.toUpperCase())
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByLabel('تکرار رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 50_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('کاربر آزمایشی آ')
    await expect(page.getByRole('button', { name: 'حساب کاربری کاربر آزمایشی آ' })).toBeVisible()
    await expect(page.locator('.user-avatar')).toHaveText('ک')
    await expect(page.locator('.account-profile')).toContainText('مشتری')

    const user = await db.user.findUniqueOrThrow({ where: { email } })
    expect(user.role).toBe('CUSTOMER')
    expect(await compare(password, user.passwordHash)).toBe(true)
    const session = await (await page.request.get('/api/auth/session')).json()
    expect(session.user.id).toBe(user.id)
    expect(session.user.role).toBe('CUSTOMER')
    expect(session.user.passwordHash).toBeUndefined()
    expect(session.user.password).toBeUndefined()
    const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name.endsWith('authjs.session-token'))!
    expect(sessionCookie.httpOnly).toBe(true)
    expect(sessionCookie.sameSite).toBe('Lax')
    expect(sessionCookie.expires - Date.now() / 1000).toBeGreaterThan(14 * 86400 - 180)
    expect(sessionCookie.expires - Date.now() / 1000).toBeLessThanOrEqual(14 * 86400 + 60)

    const restored = await browser.newContext({ storageState: await page.context().storageState() })
    try {
      const returning = await restored.newPage()
      await returning.goto('http://127.0.0.1:3000/account')
      await expect(returning.getByRole('heading', { level: 1 })).toContainText('کاربر آزمایشی آ')
    } finally { await restored.close() }

    await page.screenshot({ path: `artifacts/ui/account-${testInfo.project.name}.png`, fullPage: true })
    await page.getByRole('button', { name: 'حساب کاربری کاربر آزمایشی آ' }).click()
    await page.getByRole('menuitem', { name: 'خروج از حساب' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'ورود/ثبت‌نام', exact: true })).toBeVisible()
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?next=/)
    await page.getByLabel('ایمیل', { exact: true }).fill(email)
    await page.getByLabel('رمز عبور', { exact: true }).fill('incorrect-password')
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page.locator('.form-error[role="alert"]')).toHaveText('ایمیل یا رمز عبور درست نیست.', { timeout: 30_000 })
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 })

    // A modified encrypted cookie must not authorize the account page.
    await page.context().addCookies([{ ...sessionCookie, value: sessionCookie.value + 'tampered' }])
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?next=/)
  })

  test('seeded admin and bahram can sign in with their original passwords', async ({ page }) => {
    const credentials: Record<string, string> = JSON.parse(await readFile('.seed-users.local.json', 'utf8'))
    for (const [email, role, initial] of [['admin@acoffee.test', 'مدیر', 'A'], ['bahram@acoffee.test', 'مشتری', 'B']]) {
      await page.goto('/login')
      await page.getByLabel('ایمیل', { exact: true }).fill(email)
      await page.getByLabel('رمز عبور', { exact: true }).fill(credentials[email])
      await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
      await expect(page).toHaveURL(/\/account$/, { timeout: 40_000 })
      await expect(page.locator('.account-profile')).toContainText(role)
      await expect(page.locator('.user-avatar')).toHaveText(initial)
      await page.getByRole('button', { name: /حساب کاربری/ }).click()
      await page.getByRole('menuitem', { name: 'خروج از حساب' }).click()
      await expect(page).toHaveURL(/\/$/)
    }
  })

  test('login and registration limits are enforced and expired windows reset', async ({ page }) => {
    const email = `auth-e2e-${randomUUID()}@acoffee.test`
    emails.push(email)
    const key = (operation: string) => createHash('sha256').update(`${operation}:${email}`).digest('hex')
    await db.authRateLimit.createMany({ data: [
      { key: key('login'), attempts: 8, resetsAt: new Date(Date.now() + 900_000) },
      { key: key('register'), attempts: 3, resetsAt: new Date(Date.now() + 3_600_000) },
    ] })
    await page.goto('/login')
    await page.getByLabel('ایمیل', { exact: true }).fill(email)
    await page.getByLabel('رمز عبور', { exact: true }).fill('test-password-limit')
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page.locator('.form-error')).toContainText('۱۵ دقیقه بعد', { timeout: 30_000 })
    await db.authRateLimit.update({ where: { key: key('login') }, data: { resetsAt: new Date(Date.now() - 60_000) } })
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page.locator('.form-error')).toHaveText('ایمیل یا رمز عبور درست نیست.', { timeout: 30_000 })
    expect((await db.authRateLimit.findUniqueOrThrow({ where: { key: key('login') } })).attempts).toBe(1)
    await page.goto('/register')
    await page.getByLabel('نام و نام خانوادگی', { exact: true }).fill('کاربر آزمایشی')
    await page.getByLabel('ایمیل', { exact: true }).fill(email)
    await page.getByLabel('رمز عبور', { exact: true }).fill('test-password-limit')
    await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('test-password-limit')
    await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click()
    await expect(page.locator('.form-error')).toContainText('یک ساعت بعد', { timeout: 30_000 })
    expect(await db.user.findUnique({ where: { email } })).toBeNull()
  })
})
