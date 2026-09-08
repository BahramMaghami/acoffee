import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loginSchema, registerSchema } from '../../lib/validators/auth'
import { safeAuthRedirect } from '../../lib/auth-redirect'
import { formatPersianDate } from '../../lib/date'

test('credentials normalize email while preserving exact password characters', () => {
  const data = loginSchema.parse({ email: '  Bahram@Example.com ', password: ' exact password ' })
  assert.equal(data.email, 'bahram@example.com')
  assert.equal(data.password, ' exact password ')
})

test('registration rejects mismatched passwords and bcrypt truncation, and strips a submitted role', () => {
  const valid = { name: '  بهرام  ', email: 'BAHRAM@example.com', password: 'long-password-123', confirmPassword: 'long-password-123' }
  assert.equal(registerSchema.safeParse({ ...valid, confirmPassword: 'other-password' }).success, false)
  const oversized = 'آ'.repeat(37)
  assert.equal(loginSchema.safeParse({ email: valid.email, password: oversized }).success, false)
  assert.equal(registerSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' }).success, false)
  const parsed = registerSchema.parse({ ...valid, role: 'ADMIN', id: 'injected' })
  assert.equal(parsed.name, 'بهرام')
  assert.equal('role' in parsed, false)
  assert.equal('id' in parsed, false)
})

test('post-auth redirects reject external, encoded and protocol-relative destinations', () => {
  for (const destination of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', 'javascript:alert(1)', '/api/auth/signout', undefined]) {
    assert.equal(safeAuthRedirect(destination), '/account')
  }
  assert.equal(safeAuthRedirect('/cart'), '/cart')
  assert.equal(safeAuthRedirect('/shop/daily-blend'), '/shop/daily-blend')
})

test('membership dates display the Persian calendar using Tehran local time', () => {
  assert.match(formatPersianDate('2024-03-20T12:00:00Z'), /۱ فروردین ۱۴۰۳/)
  assert.throws(() => formatPersianDate('invalid'), RangeError)
})
