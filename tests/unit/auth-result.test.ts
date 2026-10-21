import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Auth, raw, skipCSRFCheck } from '@auth/core'
import Credentials from '@auth/core/providers/credentials'
import { assertSignInRedirect } from '../../lib/auth-result'

test('only successful auth destinations pass; callback fallbacks and errors fail', () => {
  assert.doesNotThrow(() => assertSignInRedirect('https://coffee.example/account', '/account'))
  assert.doesNotThrow(() => assertSignInRedirect('https://coffee.example/admin', '/admin'))
  for (const value of [undefined, '', '/api/auth/callback/credentials', '/login?error=Configuration', '/account?error=Configuration', '/other']) {
    assert.throws(() => assertSignInRedirect(value, '/account'), { name: 'AuthSignInIncomplete' })
  }
})

test('installed Auth.js configuration failures return no session cookie without throwing', async () => {
  for (const trustHost of [false, true]) {
    const errors: string[] = []
    const response = await Auth(new Request('https://coffee.example/api/auth/callback/credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ callbackUrl: '/account' }),
    }), {
      basePath: '/api/auth', trustHost,
      // First case tests UntrustedHost; second tests MissingSecret.
      secret: trustHost ? undefined : 'temporary-test-secret-at-least-32-characters',
      raw, skipCSRFCheck, providers: [Credentials({ authorize: () => null })],
      logger: { error: error => errors.push(error.name) },
    })
    assert.ok(response instanceof Response)
    assert.equal(response.status, 500)
    assert.equal(response.headers.get('set-cookie'), null)
    assert.ok(errors.includes(trustHost ? 'MissingSecret' : 'UntrustedHost'))
    // This is the fallback returned by next-auth/lib/actions.js for that response.
    const returnedUrl = response.headers.get('Location') ?? 'https://coffee.example/api/auth/callback/credentials'
    assert.throws(() => assertSignInRedirect(returnedUrl, '/account'), { name: 'AuthSignInIncomplete' })
  }
})

test('valid HTTPS credentials callback creates a secure HttpOnly fourteen-day session', async () => {
  const response = await Auth(new Request('https://coffee.example/api/auth/callback/credentials', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ callbackUrl: '/account' }),
  }), {
    basePath: '/api/auth', trustHost: true,
    secret: 'temporary-test-secret-at-least-32-characters',
    raw, skipCSRFCheck,
    session: { strategy: 'jwt', maxAge: 14 * 24 * 60 * 60 },
    providers: [Credentials({ authorize: () => ({ id: 'test-user', email: 'test@example.test', role: 'CUSTOMER' as const }) })],
  })
  assert.ok(!(response instanceof Response))
  assertSignInRedirect(response.redirect, '/account')
  const cookie = response.cookies?.find(cookie => cookie.name === '__Secure-authjs.session-token')
  assert.ok(cookie?.value)
  assert.equal(cookie.options.httpOnly, true)
  assert.equal(cookie.options.secure, true)
  assert.equal(cookie.options.sameSite, 'lax')
  assert.ok(cookie.options.expires)
  assert.ok(Math.abs(cookie.options.expires.getTime() - Date.now() - 14 * 86400_000) < 10000)
})
