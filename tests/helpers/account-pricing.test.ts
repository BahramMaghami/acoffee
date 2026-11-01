import { test } from 'node:test'
import assert from 'node:assert/strict'
import { productPricePreview } from '../../lib/product-price-preview'
import { categoryDefaults, calculateProductPrices, maxPrice } from '../../lib/product-pricing'
import { changePasswordSchema, resetPasswordSchema, forgotPasswordSchema, profileSchema } from '../../lib/validators/auth'
import { matchesSessionVersion } from '../../lib/session-version'
import { readMailConfig } from '../../lib/mail-config'
import { testDatabaseUrls } from './test-database'

test('invalid overrides preserve rows and invalidate only dependent 10kg prices', () => {
  const options = categoryDefaults('wholesale')
  const raw = { basePrices: { standard: '۲۰۰۰۰۰۰', vip: '3000000' }, overrides: { '5000-medium-standard': 'abc' } }
  const preview = productPricePreview(options, raw)
  assert.equal(preview.rows.length, 8)
  assert.equal(preview.rows.find(r => r.key === '5000-medium-standard')?.invalid, true)
  assert.equal(preview.rows.find(r => r.key === '10000-medium-standard')?.invalid, true)
  assert.equal(preview.rows.find(r => r.key === '10000-medium-dark-standard')?.price, 19400000)
  assert.equal(preview.rows.find(r => r.key === '10000-medium-vip')?.price, 29100000)
  assert.ok(preview.errors['overrides.5000-medium-standard'])
  const corrected = productPricePreview(options, { ...raw, overrides: { '5000-medium-standard': '۱۲۰۰۰۰۰۰' } })
  assert.equal(corrected.rows.find(r => r.key === '10000-medium-standard')?.price, 23280000)
  assert.ok(corrected.rows.every(r => !r.invalid))
  const automatic = productPricePreview(options, { ...raw, overrides: {} })
  assert.equal(automatic.rows.find(r => r.key === '5000-medium-standard')?.price, 10000000)
})

test('a manual 10kg price ignores an invalid dependency and migrated unknown prices remain unknown', () => {
  const options = categoryDefaults('wholesale')
  const raw = { basePrices: { standard: 'bad', vip: '' }, overrides: { '5000-medium-standard': 'bad', '10000-medium-standard': '۳۲۰۰۰۰۰۰', '5000-medium-vip': '' } }
  const rows = productPricePreview(options, raw).rows
  assert.equal(rows.find(r => r.key === '10000-medium-standard')?.price, 32000000)
  assert.equal(rows.find(r => r.key === '10000-medium-standard')?.invalid, false)
  assert.equal(rows.find(r => r.key === '10000-medium-standard')?.discountPercent, 0)
  assert.equal(rows.find(r => r.key === '5000-medium-vip')?.price, null)
})

test('preview matches server calculations and isolates overflow', () => {
  const options = categoryDefaults('blend')
  const preview = productPricePreview(options, { basePrices: { standard: '1234567', vip: '2222222' }, overrides: { '500-medium-vip': '1000001' } })
  const server = calculateProductPrices({ ...options, basePrices: { standard: 1234567, vip: 2222222 }, overrides: { '500-medium-vip': 1000001 } })
  assert.deepEqual(preview.rows.map(({ invalid, ...row }) => { assert.equal(invalid, false); return row }), server)
  const large = productPricePreview({ ...options, weights: [250, 1000, 10000] }, { basePrices: { standard: String(maxPrice), vip: '1000' }, overrides: {} })
  assert.equal(large.rows.length, 12)
  assert.equal(large.rows.find(r => r.key === '10000-medium-standard')?.invalid, true)
  assert.equal(large.rows.find(r => r.key === '1000-medium-standard')?.price, maxPrice)
})

test('account validators normalize identities, strip forbidden fields and enforce the existing password policy', () => {
  assert.deepEqual(profileSchema.parse({ name: '  بهرام  ', role: 'ADMIN', email: 'other@test.test' }), { name: 'بهرام' })
  assert.equal(forgotPasswordSchema.parse({ email: '  USER@EXAMPLE.COM ' }).email, 'user@example.com')
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', password: '12345678', confirmPassword: 'different' }).success, false)
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', password: 'آ'.repeat(37), confirmPassword: 'آ'.repeat(37) }).success, false)
  assert.equal(resetPasswordSchema.safeParse({ token: 'x'.repeat(43), password: '12345678', confirmPassword: '12345678' }).success, true)
  assert.equal(resetPasswordSchema.safeParse({ token: '../bad', password: '12345678', confirmPassword: '12345678' }).success, false)
})

test('legacy and fresh sessions cannot adopt a revoked version', () => {
  assert.equal(matchesSessionVersion(undefined, 0), true)
  assert.equal(matchesSessionVersion(undefined, 1), false)
  assert.equal(matchesSessionVersion(0, 1), false)
  assert.equal(matchesSessionVersion(1, 1), true)
  for (const bad of ['1', null, -1, NaN]) assert.equal(matchesSessionVersion(bad, 1), false)
})

test('mail config requires a canonical safe origin and encrypted production transport', () => {
  assert.equal(readMailConfig({}), null)
  const env = { NODE_ENV: 'production', SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'user', SMTP_PASS: 'test', SMTP_FROM: 'noreply@example.test', AUTH_URL: 'https://shop.example.test' } as NodeJS.ProcessEnv
  assert.equal(readMailConfig(env)?.requireTLS, true)
  assert.equal(readMailConfig({ ...env, SMTP_PORT: '465' })?.secure, true)
  for (const AUTH_URL of ['http://shop.example.test', 'https://user:secret@shop.example.test', 'https://shop.example.test/path', 'https://shop.example.test?next=bad']) assert.equal(readMailConfig({ ...env, AUTH_URL }), null)
  assert.equal(readMailConfig({ ...env, SMTP_FROM: 'a\r\nBcc:b' }), null)
})

test('database tests reject missing URLs, mismatched branches and main endpoints', () => {
  assert.throws(() => testDatabaseUrls({}))
  const env = { TEST_DATABASE_URL: 'postgresql://u:p@ep-test-pooler.us-east-1.aws.neon.tech/db', TEST_DIRECT_URL: 'postgresql://u:p@ep-test.us-east-1.aws.neon.tech/db' }
  assert.ok(testDatabaseUrls(env).pooled)
  assert.throws(() => testDatabaseUrls({ ...env, DATABASE_URL: env.TEST_DIRECT_URL }))
  assert.throws(() => testDatabaseUrls({ ...env, TEST_DIRECT_URL: 'postgresql://u:p@ep-other.us-east-1.aws.neon.tech/db' }))
})
