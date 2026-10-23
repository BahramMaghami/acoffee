import 'dotenv/config'
import { test, expect, type Page } from '@playwright/test'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { hash } from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('product management redirects guests before reading or mutating products', async ({ page }) => {
  for (const path of ['/admin/products', '/admin/products/new', '/admin/products/missing/edit']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/)
    await expect(page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true })).toHaveCount(0)
  }
})
test.describe('Neon product management', () => {
  test.skip(process.env.ADMIN_PRODUCTS_E2E !== '1', 'Requires migrated Neon; creates and cleans up only isolated test users/products/orders.')
  test.setTimeout(300000)
  const token = randomUUID()
  const categoryName = `آزمایشی ${token}`
  const emails = [`products-admin-${token}@acoffee.test`, `products-customer-${token}@acoffee.test`]
  let db: PrismaClient
  test.beforeAll(() => { db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) }) })
  test.afterAll(async () => {
    try {
      const owners = { user: { email: { in: emails } } }
      await db.orderItem.deleteMany({ where: { order: owners } })
      await db.order.deleteMany({ where: owners })
      await db.catalogProduct.deleteMany({ where: { category: { name: categoryName } } })
      await db.category.deleteMany({ where: { name: categoryName } })
      await db.user.deleteMany({ where: { email: { in: emails } } })
      await db.authRateLimit.deleteMany({ where: { key: { in: emails.map(email => createHash('sha256').update(`login:${email}`).digest('hex')) } } })
    } finally { await db.$disconnect() }
  })
  test('create, edit, checkout, stale edit, deactivate and delete preserve historical orders', async ({ page, browser }) => {
    const password = randomBytes(24).toString('base64url')
    const passwordHash = await hash(password, 12)
    const admin = await db.user.create({ data: { name: 'مدیر تست محصولات', email: emails[0], passwordHash, role: 'ADMIN' } })
    await db.user.create({ data: { name: 'مشتری تست محصولات', email: emails[1], passwordHash } })
    async function login(target: Page, email: string) {
      await target.goto('http://127.0.0.1:3000/login?next=%2Fadmin')
      await target.getByLabel('ایمیل', { exact: true }).fill(email)
      await target.getByLabel('رمز عبور', { exact: true }).fill(password)
      await target.getByRole('button', { name: 'ورود به حساب', exact: true }).click()
    }
    const outsider = await browser.newContext()
    try {
      const other = await outsider.newPage()
      await login(other, emails[1])
      await expect(other).toHaveURL(/\/account$/, { timeout: 40000 })
      await other.goto('http://127.0.0.1:3000/admin/products/new')
      await expect(other).toHaveURL(/\/account$/)
    } finally { await outsider.close() }

    await login(page, emails[0])
    await expect(page).toHaveURL(/\/admin$/, { timeout: 40000 })
    await page.goto('/admin/products/new')
    await page.getByRole('button', { name: 'افزودن دسته', exact: true }).click()
    await page.getByLabel('نام دستهٔ جدید', { exact: true }).fill(categoryName)
    await page.getByLabel('۲. نام محصول', { exact: true }).fill('قهوهٔ آزمایشی پنل')
    await page.getByLabel('Commercial Blend · یک کیلو', { exact: true }).fill('۱۰۰۰۰۰۰')
    await page.getByLabel('Premium Blend · یک کیلو', { exact: true }).fill('۲۰۰۰۰۰۰')
    await expect(page.locator('.admin-price-table tbody tr')).toHaveCount(12)
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 60000 })
    const product = await db.catalogProduct.findFirstOrThrow({ where: { category: { name: categoryName } }, include: { variants: true, category: true } })
    expect(product.variants).toHaveLength(12)
    const sku = product.variants.find(v => v.weightGrams === 250 && v.roast === 'medium' && v.grade === 'standard')!
    expect(Number(sku.price)).toBe(250000)
    expect(product.imageUrl).toBeNull()
    await page.goto(`/shop/category/${product.category.slug}`)
    await expect(page.locator('.product-card h3')).toHaveText(['قهوهٔ آزمایشی پنل'])
    await page.goto(`/shop/${product.slug}`)
    await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click()
    await page.goto('/checkout/address')
    await page.getByLabel('استان', { exact: true }).fill('تهران')
    await page.getByLabel('شهر', { exact: true }).fill('تهران')
    await page.getByLabel('نشانی کامل', { exact: true }).fill('نشانی موقت تست محصولات، پلاک ۱')
    await page.getByLabel('کد پستی', { exact: true }).fill('1234567890')
    await page.getByLabel('شماره تماس', { exact: true }).fill('09121234567')
    await page.getByRole('button', { name: 'ذخیره و بررسی سفارش' }).click()
    await expect(page).toHaveURL(/\/checkout\/place-order$/, { timeout: 40000 })
    await page.getByRole('button', { name: 'ثبت سفارش و ادامه' }).click()
    await expect(page).toHaveURL(/\/orders\//, { timeout: 40000 })
    const order = await db.order.findFirstOrThrow({ where: { userId: admin.id }, include: { items: true } })
    expect(Number(order.total)).toBe(250000)
    const editUrl = `/admin/products/${product.id}/edit`
    await page.goto(editUrl)
    await expect(page.getByLabel('۲. نام محصول', { exact: true })).toHaveValue(product.name)
    // Simulate a second administrator saving while this form is open.
    await db.catalogProduct.update({ where: { id: product.id }, data: { name: 'تغییر هم‌زمان' } })
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'محصول تغییر کرده' })).toBeVisible()
    await page.reload()
    await page.getByLabel('۲. نام محصول', { exact: true }).fill('قهوهٔ ویرایش‌شده')
    await page.getByLabel('Commercial Blend · یک کیلو', { exact: true }).fill('1200000')
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 60000 })
    expect((await db.catalogProduct.findUniqueOrThrow({ where: { id: product.id } })).slug).toBe(product.slug)
    expect(Number((await db.product.findUniqueOrThrow({ where: { id: sku.id } })).price)).toBe(300000)
    expect((await db.orderItem.findUniqueOrThrow({ where: { id: order.items[0].id } })).unitPrice.toString()).toBe('250000')
    await page.goto(editUrl)
    // Removing an option requires the on-page confirmation dialog.
    await page.getByLabel('۵۰۰ گرم', { exact: true }).uncheck()
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'انصراف', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await db.product.count({ where: { catalogProductId: product.id } })).toBe(12)
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await page.getByRole('button', { name: 'تأیید و ذخیره', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 60000 })
    expect(await db.product.count({ where: { catalogProductId: product.id } })).toBe(8)
    await page.goto(editUrl)
    await mkdir('artifacts/ui', { recursive: true })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; window.scrollTo(0, 0) }, theme)
      await page.screenshot({ path: `artifacts/ui/admin-products-${theme}.png`, fullPage: true, animations: 'disabled' })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'artifacts/ui/admin-products-mobile.png', fullPage: true, animations: 'disabled' })
    await page.getByLabel('نمایش محصول در فروشگاه', { exact: true }).uncheck()
    await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 60000 })
    const unavailable = await page.goto(`/shop/${product.slug}`)
    expect(unavailable?.status()).toBe(404)
    await page.goto('/cart')
    await expect(page.getByRole('button', { name: 'حذف انتخاب ناموجود' })).toBeVisible()
    await page.goto('/admin/products')
    const row = page.getByRole('row').filter({ hasText: 'قهوهٔ ویرایش‌شده' })
    await row.getByRole('button', { name: 'حذف', exact: true }).click()
    await page.getByRole('button', { name: 'حذف دائمی محصول', exact: true }).click()
    await expect(row).toHaveCount(0, { timeout: 30000 })
    const historical = await db.orderItem.findUniqueOrThrow({ where: { id: order.items[0].id } })
    expect(historical.productId).toBeNull()
    expect(historical.productName).toBe(order.items[0].productName)
    expect(historical.unitPrice.toString()).toBe('250000')
  })
})
