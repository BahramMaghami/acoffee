import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { products, variants, maxCartQuantity } from '../../lib/storefront'

test('home keeps the hero and shows coffee selection immediately after it', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('روز خوب')
  await expect(page.locator('main > section.hero + #coffee-selection')).toBeVisible()
  await expect(page.locator('.product-card')).toHaveCount(7)
  await expect(page.locator('.product-card img')).toHaveCount(0)
  await expect(page.locator('.product-placeholder')).toHaveCount(7)
  await page.getByRole('button', { name: 'قهوه‌های مخصوص کافه‌ها', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(7)
  await expect(page.locator('.cafe-offer')).toContainText('۵ کیلوگرم و بیشتر')
  await expect(page.locator('.cafe-offer')).not.toContainText('تومان')
  await expect(page.locator('.cafe-offer a')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('artifacts/ui', { recursive: true })
  await page.screenshot({ path: 'artifacts/ui/home-cafe-' + testInfo.project.name + '.png', fullPage: true })
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'باز کردن منو' }).click()
    await page.getByRole('navigation', { name: 'منوی موبایل' }).getByRole('link', { name: 'قهوه‌های ما' }).click()
    await expect(page).toHaveURL(/\/shop$/)
  }
  expect(errors).toEqual([])
})

test('catalog filters cafe groups and traditional products and searches VIP', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.locator('.product-card')).toHaveCount(products.length)
  await page.getByRole('button', { name: 'قهوه‌های مخصوص کافه‌ها', exact: true }).click()
  await page.getByRole('button', { name: 'قهوه‌های روبوستا', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(4)
  await page.getByRole('button', { name: 'قهوه‌های عربیکا', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'قهوه‌های بلند', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(6)
  await expect(page.locator('.cafe-subcategories')).toHaveCount(0)
  await expect(page.locator('.product-card .tasting-notes')).toHaveText(Array(6).fill('معمولی / VIP'))
  await page.getByRole('textbox', { name: 'جست‌وجوی قهوه', exact: true }).fill('VIP')
  await expect(page.locator('.product-card')).toHaveCount(6)
  await expect(page.locator('.product-card h3')).toHaveText(['۱۰۰٪ روبوستا', '۸۰٪ روبوستا', '۷۰٪ روبوستا', '۵۰٪ روبوستا', '۸۰٪ عربیکا', '۱۰۰٪ عربیکا'])
  await page.getByRole('textbox', { name: 'جست‌وجوی قهوه', exact: true }).fill('پیدا نمی‌شود')
  await expect(page.getByText('این طعم را پیدا نکردیم.')).toBeVisible()
  await page.getByRole('button', { name: 'نمایش همهٔ قهوه‌ها' }).click()
  await page.getByRole('button', { name: 'قهوه‌های سنتی', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(2)
  await expect(page.locator('.product-card h3')).toHaveText(['قهوه ترک', 'قهوه ارمنی'])
  await page.getByRole('combobox', { name: 'مرتب‌سازی' }).selectOption('lowest')
  await expect(page.locator('.product-card-price')).not.toContainText(['۰ تومان', '۰ تومان'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('weight, roast and VIP selections remain separate and survive cart reload', async ({ page }, testInfo) => {
  await page.goto('/shop/cafe-blend-robusta-80')
  await expect(page.locator('.detail-copy > .eyebrow')).toHaveText('قهوه‌های بلند')
  await expect(page.locator('.detail-copy')).not.toContainText('خاستگاه')
  await page.getByRole('button', { name: '۵۰۰ گرم', exact: true }).click()
  await page.getByRole('button', { name: 'دارک رست', exact: true }).click()
  await page.getByRole('button', { name: 'VIP', exact: true }).click()
  await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click()
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'به سبدت اضافه شد.' })
  await expect(toast).toContainText('۵۰۰ گرم · دارک رست · VIP')
  await page.getByRole('button', { name: '۲۵۰ گرم', exact: true }).click()
  await page.getByRole('button', { name: 'مدیوم رست', exact: true }).click()
  await page.getByRole('button', { name: 'معمولی', exact: true }).click()
  await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click()
  await page.screenshot({ path: 'artifacts/ui/product-options-' + testInfo.project.name + '.png', fullPage: true })
  await page.goto('/cart')
  await expect(page.locator('.cart-row')).toHaveCount(2)
  await expect(page.locator('.cart-row').first()).toContainText('۵۰۰ گرم · دارک رست · VIP')
  await expect(page.locator('.cart-row').last()).toContainText('۲۵۰ گرم · مدیوم رست · معمولی')
  await page.reload()
  await expect(page.locator('.cart-row')).toHaveCount(2)
  await page.locator('.cart-row').first().getByRole('button', { name: /^افزایش تعداد/ }).click()
  await expect(page.locator('.cart-row').first().locator('output')).toHaveText('۲')
  await expect(page.locator('.cart-row').last().locator('output')).toHaveText('۱')
  await expect(page.locator('.summary-total dd')).toHaveText('پس از اعلام قیمت')
  await expect(page.getByRole('button', { name: 'در انتظار اعلام قیمت' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.cart-row').first().getByRole('button', { name: /^حذف/ }).click()
  await expect(page.locator('.cart-row')).toHaveCount(1)
})

test('cart rejects unsupported variants and caps quantities without inventing stock', async ({ page }) => {
  await page.goto('/cart')
  await page.evaluate(() => localStorage.setItem('acoffee:preview-cart:v1', 'not json'))
  await page.reload()
  await expect(page.locator('.cart-empty')).toBeVisible()
  await page.evaluate((id) => localStorage.setItem('acoffee:preview-cart:v1', JSON.stringify([
    { productId: id, quantity: 999 }, { productId: id, quantity: 2 },
    { productId: 'arabica-100--1000-default-standard', quantity: 1 },
    { productId: 'unknown', quantity: 1 },
  ])), variants[0].id)
  await page.reload()
  await expect(page.locator('.cart-row')).toHaveCount(1)
  await expect(page.locator('.cart-row output')).toHaveText(new Intl.NumberFormat('fa-IR').format(maxCartQuantity))
  await expect(page.getByRole('button', { name: /^افزایش تعداد/ })).toBeDisabled()
})

test('traditional products expose only requested weights and supporting pages still work', async ({ page }) => {
  await page.goto('/shop/turkish-coffee')
  await expect(page.locator('.purchase-options legend')).toHaveText('وزن بسته')
  await expect(page.locator('.option-buttons button')).toHaveText(['۱۰۰ گرم', '۲۵۰ گرم', '۵۰۰ گرم'])
  for (const [path, heading] of [['/about', 'برای یک مکث'], ['/guide', 'خوب دم کن']]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
  }
  await page.goto('/shop/does-not-exist')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('این صفحه را پیدا نکردیم.')
})
