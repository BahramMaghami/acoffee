import 'dotenv/config'
import { test, expect } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('guests cannot browse users', async ({ page }) => {
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/)
  await expect(page.locator('.admin-users-table')).toHaveCount(0)
})

test.describe('live user management', () => {
  test.skip(process.env.ADMIN_E2E !== '1', 'Requires Neon and temporary test users.')
  test.setTimeout(180_000)
  let db: PrismaClient
  const emails: string[] = []
  test.beforeAll(() => {
    db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) })
  })
  test.afterAll(async () => {
    try {
      await db.user.deleteMany({ where: { email: { in: emails } } })
      await db.authRateLimit.deleteMany({ where: { key: { in: emails.map(email => createHash('sha256').update(`login:${email}`).digest('hex')) } } })
    } finally { await db.$disconnect() }
  })
  test('paginates twenty users, changes roles, confirms deletion and denies customers', async ({ page }) => {
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    const prefix = `users-e2e-${randomUUID()}`
    for (let index = 0; index < 22; index++) emails.push(`${prefix}-${index}@acoffee.test`)
    await db.user.createMany({ data: emails.map((email, index) => ({
      email, name: `Temporary user ${index}`, passwordHash, role: index === 0 ? 'ADMIN' as const : 'CUSTOMER' as const,
      createdAt: new Date(Date.now() + index * 1000),
    })) })
    const target = await db.user.findUniqueOrThrow({ where: { email: emails[21] }, select: { id: true } })
    await page.goto('/login')
    await page.getByLabel('ایمیل', { exact: true }).fill(emails[0])
    await page.getByLabel('رمز عبور', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 40000 })
    await page.goto('/admin/users')
    await expect(page.locator('tbody tr')).toHaveCount(20)
    const row = page.locator('tbody tr').filter({ hasText: emails[21] })
    const confirmation = page.getByRole('dialog')
    await row.getByRole('button', { name: 'تبدیل به مدیر', exact: true }).click()
    await expect(confirmation.getByRole('heading', { name: 'تغییر نقش کاربر' })).toBeVisible()
    await expect(confirmation.getByRole('button', { name: 'انصراف' })).toBeFocused()
    await confirmation.getByRole('button', { name: 'انصراف' }).click()
    await expect(confirmation).toHaveCount(0)
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe('CUSTOMER')
    await row.getByRole('button', { name: 'تبدیل به مدیر', exact: true }).click()
    await confirmation.getByRole('button', { name: 'تأیید تغییر نقش' }).click()
    await expect(row.getByRole('button', { name: 'تبدیل به کاربر', exact: true })).toBeVisible()
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe('ADMIN')
    await row.getByRole('button', { name: 'تبدیل به کاربر', exact: true }).click()
    await confirmation.getByRole('button', { name: 'تأیید تغییر نقش' }).click()
    await expect(row.getByRole('button', { name: 'تبدیل به مدیر', exact: true })).toBeVisible()
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe('CUSTOMER')
    await row.getByRole('button', { name: 'حذف', exact: true }).click()
    await expect(confirmation.getByRole('heading', { name: 'حذف حساب کاربر' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(confirmation).toHaveCount(0)
    await expect(row).toHaveCount(1)
    await row.getByRole('button', { name: 'حذف', exact: true }).click()
    await confirmation.getByRole('button', { name: 'حذف حساب', exact: true }).click()
    await expect(row).toHaveCount(0)
    expect(await db.user.findUnique({ where: { id: target.id } })).toBeNull()
    await page.getByRole('link', { name: 'بعدی', exact: true }).click()
    await expect(page).toHaveURL(/page=2$/)
    const self = page.locator('tbody tr').filter({ hasText: emails[0] })
    await expect(self.getByText('حساب شما')).toBeVisible()
    await expect(self.getByRole('button')).toHaveCount(0)
    await db.user.update({ where: { email: emails[0] }, data: { role: 'CUSTOMER' } })
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/account$/, { timeout: 40000 })
    await expect(page.locator('.admin-users-table')).toHaveCount(0)
  })
})
