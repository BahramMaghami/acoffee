import { test, expect, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
let bundle: string
let css: string
test.beforeAll(async () => {
  const result = await build({ entryPoints: ['tests/helpers/form-fixture.tsx'], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'form-server-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(@\/actions\/|next\/navigation$|next\/link$|next\/image$)/ }, args => ({ path: args.path, namespace: 'form-stubs' }))
      builder.onLoad({ filter: /.*/, namespace: 'form-stubs' }, args => {
        if (args.path === 'next/navigation') return { contents: 'export const useRouter = () => ({push: p => window.formTestRoute=p, replace: p => window.formTestRoute=p, refresh: () => {}});' }
        if (args.path === 'next/link') return { contents: 'import {createElement} from "react"; export default function Link({children,...props}) { return createElement("a",props,children) }', resolveDir: process.cwd() }
        if (args.path === 'next/image') return { contents: 'import {createElement} from "react"; export default function Image({fill,priority,unoptimized,...props}) { return createElement("img",props) }', resolveDir: process.cwd() }
        return { contents: `async function run(input) { window.formTestPayload=input; if (window.formTestMode==='offline') throw new Error('offline'); if (window.formTestMode==='error') return {success:false,message:'ذخیره انجام نشد؛ دوباره تلاش کن.'}; return {success:true,message:'ذخیره شد.'} }
          export const saveProductAction=run, updateProfileAction=run, changePasswordAction=run, saveAddressAction=run, requestPasswordResetAction=run, resetPasswordAction=run;
          export async function requestSignupOtpAction(input) { const result=await run(input); return {...result,challengeId:'b9ec07be-a73b-47d8-b230-7247827c0d28',expiresAt:new Date(Date.now()+120000).toISOString(),resendAt:new Date().toISOString()}; }
          export async function registerAction(input) { const result=await run(input); return {...result,redirectTo:'/account'}; }
          export const requestAccountPhoneOtpAction = requestSignupOtpAction;
          export async function verifyAccountPhoneOtpAction(input) { return {...await run(input),phone:'09121234567',verifiedAt:'2026-11-03T10:00:00Z'}; }
          export async function prepareProductImageAction() { throw new Error('آپلود انجام نشد؛ دوباره تلاش کن.') }` }
      })
    } }],
  })
  bundle = result.outputFiles[0].text
  css = (await Promise.all(['app/admin/admin.css', 'app/admin/products/products.css', 'app/checkout/checkout.css', 'app/account/account.css'].map(path => readFile(path, 'utf8')))).join('\n')
})

async function openForm(page: Page, kind: string) {
  const html = await (await page.request.get('/guide')).text()
  const stylesheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]).join('')
  await page.route('**/__form-test', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="fa" dir="rtl" data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1">${stylesheets}</head><body><main><div id="form-fixture" class="shell page-space"></div></main></body></html>` }))
  await page.goto('/__form-test')
  await page.addStyleTag({ content: css })
  await page.addScriptTag({ content: bundle })
  await page.evaluate(kind => window.mountFormTest(kind), kind)
}

test('account phone verifies, preserves failed inputs, allows immediate resend and readonly verified state', async ({ page }, info) => {
  await openForm(page, 'phone')
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.locator('#account-contact-phone-error')).not.toBeEmpty()
  await expect(page.locator('#phone-password-error')).not.toBeEmpty()
  await page.getByRole('textbox', { name: 'شمارهٔ موبایل حساب', exact: true }).fill('۰۹۱۲۱۲۳۴۵۶۷')
  await page.getByLabel('رمز فعلی حساب', { exact: true }).fill('test-password')
  await page.evaluate(() => { window.formTestMode = 'offline' })
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.getByRole('alert')).toContainText('حفظ شده')
  await expect(page.getByLabel('رمز فعلی حساب', { exact: true })).toHaveValue('test-password')
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.getByRole('button', { name: /ارسال مجدد/ })).toBeEnabled()
  await page.getByRole('button', { name: /ارسال مجدد/ }).click()
  await expect(page.locator('#account-contact-phone')).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: 'تأیید و ثبت شماره' }).click()
  await expect(page.locator('#account-phone-code-error')).toContainText('۶ رقم')
  await page.getByLabel('کد تأیید پیامکی').fill('۱۲۳۴۵۶')
  await page.evaluate(() => { window.formTestMode = 'error' })
  await page.getByRole('button', { name: 'تأیید و ثبت شماره' }).click()
  await expect(page.getByRole('alert')).toContainText('دوباره تلاش کن')
  await expect(page.getByLabel('کد تأیید پیامکی')).toHaveValue('۱۲۳۴۵۶')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await expect(page.locator('#account-phone-code')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(27, 25, 23)' : 'rgb(255, 250, 243)')
    await page.screenshot({ path: info.outputPath(`account-phone-${theme}.png`), fullPage: true, animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'تأیید و ثبت شماره' }).click()
  await expect(page.getByRole('status')).toContainText('تأییدشده')
  await expect(page.locator('input')).toHaveCount(0)
  expect(await page.evaluate(() => window.formTestPayload)).toEqual({ challengeId: 'b9ec07be-a73b-47d8-b230-7247827c0d28', code: '123456' })
  await openForm(page, 'verified-phone')
  await expect(page.getByRole('status')).toContainText('09121234567')
  await expect(page.getByRole('button')).toHaveCount(0)
})

test('signup requires a phone and code, retains inputs on failure and supports changing details', async ({ page }, info) => {
  await openForm(page, 'signup')
  await page.getByLabel('نام و نام خانوادگی').fill('کاربر آزمایشی')
  await page.getByLabel('ایمیل', { exact: true }).fill('signup@example.test')
  await page.getByLabel('رمز عبور', { exact: true }).fill('test-password')
  await page.getByLabel('تکرار رمز عبور', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.locator('#register-phone-error')).not.toBeEmpty()
  await page.getByLabel('شمارهٔ موبایل').fill('۰۹۱۲۱۲۳۴۵۶۷')
  await page.evaluate(() => { window.formTestMode = 'offline' })
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.getByRole('alert')).toContainText('اطلاعاتت حفظ شده')
  await expect(page.getByLabel('شمارهٔ موبایل')).toHaveValue('۰۹۱۲۱۲۳۴۵۶۷')
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await expect(page.getByLabel('کد تأیید پیامکی')).toBeVisible()
  await expect(page.getByRole('button', { name: /ارسال مجدد/ })).toBeEnabled()
  await page.getByRole('button', { name: /ارسال مجدد/ }).click()
  await expect(page.getByLabel('ایمیل', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: 'تأیید کد و ساخت حساب' }).click()
  await expect(page.locator('#register-otp-error')).toContainText('۶ رقم')
  await page.getByLabel('کد تأیید پیامکی').fill('۱۲۳۴۵۶')
  await page.evaluate(() => { window.formTestMode = 'error' })
  await page.getByRole('button', { name: 'تأیید کد و ساخت حساب' }).click()
  await expect(page.getByRole('alert')).toContainText('دوباره تلاش کن')
  await expect(page.getByLabel('کد تأیید پیامکی')).toHaveValue('۱۲۳۴۵۶')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await page.screenshot({ path: info.outputPath(`signup-otp-${theme}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'ویرایش اطلاعات' }).click()
  await expect(page.getByLabel('کد تأیید پیامکی')).toHaveCount(0)
  await expect(page.getByLabel('ایمیل', { exact: true })).not.toHaveAttribute('readonly', '')
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  await page.getByLabel('کد تأیید پیامکی').fill('۱۲۳۴۵۶')
  await page.getByRole('button', { name: 'تأیید کد و ساخت حساب' }).click()
  await expect.poll(() => page.evaluate(() => window.formTestRoute)).toBe('/account')
  expect(await page.evaluate(() => window.formTestPayload)).toMatchObject({ phone: '09121234567', code: '123456' })
})

test('product price input stays editable, isolates dependencies and can return to automatic pricing', async ({ page }, info) => {
  await openForm(page, 'product')
  const input = page.getByRole('textbox', { name: 'قیمت مستقل ۵ کیلوگرم · مدیوم · Commercial Blend', exact: true })
  const row = input.locator('xpath=ancestor::tr')
  await input.fill('abc')
  await expect(page.locator('.admin-price-table tbody tr')).toHaveCount(8)
  await expect(input).toHaveValue('abc')
  await expect(row).toContainText('قابل محاسبه نیست')
  await expect(page.getByRole('row').filter({ hasText: '۱۰ کیلوگرم · مدیوم · Commercial Blend' })).toContainText('قابل محاسبه نیست')
  await expect(page.getByRole('row').filter({ hasText: '۱۰ کیلوگرم · مدیوم-دارک · Premium Blend' })).toContainText('۲۹٬۱۰۰٬۰۰۰')
  await input.fill('۱۲۰۰۰۰۰۰')
  await expect(row).toContainText('۱۲٬۰۰۰٬۰۰۰ تومان')
  await row.getByRole('button', { name: 'بازگشت به محاسبه' }).click()
  await expect(input).toHaveValue('')
  await expect(row).toContainText('۱۰٬۰۰۰٬۰۰۰ تومان')
  await page.evaluate(() => { window.formTestMode = 'offline' })
  await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('دوباره تلاش کن')
  await expect(page.getByLabel('۲. نام محصول')).toHaveValue('قهوهٔ آزمون')
  await page.locator('#product-image').setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: Buffer.from('fake') })
  await expect(page.getByRole('alert').filter({ hasText: 'آپلود' })).toBeVisible()
  await expect(page.locator('.admin-image-preview img:visible')).toHaveCount(1)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await expect(page.locator('.form-field input').first()).toHaveCSS('background-color', theme === 'dark' ? 'rgb(27, 25, 23)' : 'rgb(255, 250, 243)')
    await page.screenshot({ path: info.outputPath(`product-form-${theme}.png`), fullPage: true, animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'ذخیرهٔ محصول', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.formTestRoute)).toBe('/admin/products')
})

test('account forms validate independently and retain input after failed requests', async ({ page }, info) => {
  await openForm(page, 'account')
  const name = page.getByRole('form', { name: 'ویرایش مشخصات' })
  await expect(page.getByLabel('ایمیل ورود')).toHaveAttribute('readonly', '')
  await name.getByLabel('نام', { exact: true }).fill('آرش')
  await page.evaluate(() => { window.formTestMode = 'offline' })
  await name.getByRole('button', { name: 'ذخیرهٔ نام' }).click()
  await expect(name.getByRole('alert')).toBeVisible()
  await expect(name.getByLabel('نام', { exact: true })).toHaveValue('آرش')
  await page.getByLabel('استان', { exact: true }).fill('تهران')
  await page.getByLabel('شهر', { exact: true }).fill('تهران')
  await page.getByLabel('کد پستی').fill('۱۲۳۴۵۶۷۸۹۰')
  await page.getByLabel('شماره تماس').fill('۰۹۱۲۱۲۳۴۵۶۷')
  await page.getByLabel('نشانی کامل').fill('خیابان آزمایش، کوچهٔ آ، پلاک ۱۲')
  await page.getByRole('button', { name: 'ذخیرهٔ آدرس', exact: true }).click()
  await expect(page.getByRole('form', { name: 'آدرس ارسال' }).getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('نشانی کامل')).toHaveValue('خیابان آزمایش، کوچهٔ آ، پلاک ۱۲')
  await page.evaluate(() => { window.formTestMode = 'success' })
  await page.getByRole('button', { name: 'ذخیرهٔ آدرس', exact: true }).click()
  await expect(page.getByRole('form', { name: 'آدرس ارسال' }).getByRole('status')).toContainText('ذخیره شد')
  expect(await page.evaluate(() => window.formTestPayload)).toMatchObject({ postalCode: '1234567890', phone: '09121234567' })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await expect(page.locator('.form-field input').first()).toHaveCSS('background-color', theme === 'dark' ? 'rgb(27, 25, 23)' : 'rgb(255, 250, 243)')
    await page.screenshot({ path: info.outputPath(`account-forms-${theme}.png`), fullPage: true, animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('recovery forms handle delivery requests, invalid passwords and connection failure', async ({ page }) => {
  await openForm(page, 'forgot')
  await page.getByLabel('ایمیل حساب').fill('user@example.test')
  await page.evaluate(() => { window.formTestMode = 'offline' })
  await page.getByRole('button', { name: 'درخواست لینک بازیابی' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('ایمیل حساب')).toHaveValue('user@example.test')
  await openForm(page, 'reset')
  await page.getByLabel('رمز جدید', { exact: true }).fill('longpassword-test')
  await page.getByLabel('تکرار رمز جدید', { exact: true }).fill('mismatch')
  await page.getByRole('button', { name: 'ذخیرهٔ رمز جدید' }).click()
  await expect(page.getByText('تکرار رمز عبور یکسان نیست.')).toBeVisible()
  await page.getByLabel('تکرار رمز جدید', { exact: true }).fill('longpassword-test')
  await page.getByRole('button', { name: 'ذخیرهٔ رمز جدید' }).click()
  await expect.poll(() => page.evaluate(() => window.formTestRoute)).toBe('/login?passwordChanged=1')
})

test('public recovery routes reject malformed links and do not cache or leak referrers', async ({ page }) => {
  const response = await page.goto('/reset-password?token=invalid')
  await expect(page.getByRole('alert').filter({ hasText: 'لینک بازیابی معتبر نیست' })).toBeVisible()
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  // next dev overrides response cache headers; verify no-store against next start.
  expect(response?.headers()['cache-control']).toContain(process.env.ACOFFEE_TEST_PRODUCTION === '1' ? 'no-store' : 'no-cache')
  expect(response?.headers()['x-robots-tag']).toContain('noindex')
  await page.goto('/forgot-password')
  await expect(page.getByLabel('ایمیل حساب')).toBeVisible()
})
