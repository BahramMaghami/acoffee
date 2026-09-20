import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { products, variants, maxCartQuantity } from '../../lib/storefront'

test('home keeps the hero and shows every category in a separate slider', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('main > section.hero + #coffee-selection')).toBeVisible()
  await expect(page.locator('.category-slider')).toHaveCount(3)
  await expect(page.locator('.category-slider-heading h2')).toHaveText(['قهوه‌های بلند', 'قهوه‌های مخصوص کافه‌ها', 'قهوه‌های سنتی'])
  await expect(page.locator('.filter-tabs')).toHaveCount(0)
  await expect(page.locator('.product-card')).toHaveCount(17)
  await expect(page.locator('.product-card img')).toHaveCount(0)
  await expect(page.locator('.product-placeholder')).toHaveCount(17)
  await expect(page.locator('.cafe-offer')).toContainText('۵ کیلوگرم و بیشتر')
  await expect(page.locator('.cafe-offer')).not.toContainText('تومان')
  await expect(page.locator('.cafe-offer a')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('artifacts/ui', { recursive: true })
  await page.screenshot({ path: 'artifacts/ui/home-sliders-' + testInfo.project.name + '.png', fullPage: true })
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'باز کردن منو' }).click()
    await page.getByRole('navigation', { name: 'منوی موبایل' }).getByRole('link', { name: 'قهوه‌های ما' }).click()
    await expect(page).toHaveURL(/\/shop$/)
  }
  expect(errors).toEqual([])
})

test('RTL sliders move independently with buttons, keyboard and native scrolling', async ({ page }, testInfo) => {
  await page.goto('/shop')
  const blend = page.getByRole('region', { name: 'قهوه‌های بلند', exact: true })
  const cafe = page.getByRole('region', { name: 'قهوه‌های مخصوص کافه‌ها', exact: true })
  const traditional = page.getByRole('region', { name: 'قهوه‌های سنتی', exact: true })
  await expect(blend.locator('.product-card')).toHaveCount(8)
  await expect(cafe.locator('.product-card')).toHaveCount(7)
  await expect(traditional.locator('.product-card')).toHaveCount(2)
  const track = blend.locator('.category-slider-track')
  const previous = blend.getByRole('button', { name: 'محصولات قبلی' })
  const next = blend.getByRole('button', { name: 'محصولات بعدی' })
  await expect(previous).toBeDisabled()
  await expect(next).toBeEnabled()
  await next.click()
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThan(-100)
  await expect(previous).toBeEnabled()
  expect(await cafe.locator('.category-slider-track').evaluate((element) => element.scrollLeft)).toBe(0)
  await previous.click()
  await expect(previous).toBeDisabled()
  await track.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThan(-100)
  // The same native scroll surface supports touch swipes and trackpad scrolling.
  await track.evaluate((element) => element.scrollTo({ left: -element.scrollWidth, behavior: 'instant' }))
  await expect(next).toBeDisabled()
  await expect(previous).toBeEnabled()
  if (testInfo.project.name === 'desktop') {
    await expect(traditional.getByRole('button', { name: 'محصولات بعدی' })).toBeDisabled()
  } else {
    await expect(traditional.getByRole('button', { name: 'محصولات بعدی' })).toBeEnabled()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('view all opens the complete matching category and supports direct navigation', async ({ page }) => {
  for (const [category, label, count] of [
    ['blend', 'قهوه‌های بلند', 8],
    ['cafe', 'قهوه‌های مخصوص کافه‌ها', 7],
    ['traditional', 'قهوه‌های سنتی', 2],
  ] as const) {
    await page.goto('/shop')
    const section = page.getByRole('region', { name: label, exact: true })
    await section.getByRole('link', { name: 'مشاهدهٔ همه', exact: true }).click()
    await expect(page).toHaveURL(new RegExp('/shop/category/' + category + '$'))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label)
    await expect(page.locator('.product-card')).toHaveCount(count)
    await expect(page.locator('.product-card h3')).toHaveText(products.filter((product) => product.category === category).map((product) => product.name))
    await expect(page.locator('.filter-tabs, .category-slider')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.product-card')).toHaveCount(count)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/shop/category/missing')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('این صفحه را پیدا نکردیم.')
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
