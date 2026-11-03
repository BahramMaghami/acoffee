import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

test('account phone actions reject guests and use server identity rather than browser identity', async () => {
  const state: { user: { id: string; sessionVersion: number } | null; calls: unknown[][]; paths: string[]; fail: boolean } = { user: null, calls: [], paths: [], fail: false }
  const result = await build({ entryPoints: ['actions/account-phone.actions.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'account-phone-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(next\/cache|@\/lib\/(current-user|account-phone|sms-rate-limit|auth-error))$/ }, args => ({ path: args.path, namespace: 'mock' }))
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => {
        if (args.path === 'next/cache') return { contents: 'export const revalidatePath = path => state.paths.push(path)' }
        if (args.path.endsWith('current-user')) return { contents: 'export const getCurrentUser = async () => { if(state.fail) throw new Error("database unavailable"); return state.user }' }
        if (args.path.endsWith('auth-error')) return { contents: 'export const logAuthError = () => {}' }
        if (args.path.endsWith('sms-rate-limit')) return { contents: 'export class SmsRateLimitError extends Error {}' }
        return { contents: 'export class AccountPhoneError extends Error {} ; export const requestAccountPhoneOtp = async (...args) => { state.calls.push(args); return {challengeId:"test"} }; export const verifyAccountPhoneOtp = async (...args) => { state.calls.push(args); return {phone:"09121234567", verifiedAt:"2026-11-03T10:00:00Z"} }' }
      })
    } }],
  })
  type Action = (input: unknown) => Promise<{ success: boolean; message?: string }>
  const mod = { exports: {} as { requestAccountPhoneOtpAction: Action; verifyAccountPhoneOtpAction: Action } }
  new Function('module', 'exports', 'state', result.outputFiles[0].text)(mod, mod.exports, state)
  const { requestAccountPhoneOtpAction: request, verifyAccountPhoneOtpAction: verify } = mod.exports
  const input = { phone: '09121234567', currentPassword: 'password', id: 'victim', sessionVersion: 999 }
  const proof = { challengeId: 'b9ec07be-a73b-47d8-b230-7247827c0d28', code: '123456', id: 'victim', phone: '09120000000' }
  assert.equal((await request(input)).success, false)
  assert.equal((await verify(proof)).success, false)
  assert.equal(state.calls.length, 0)
  state.user = { id: 'authenticated-user', sessionVersion: 2 }
  assert.equal((await request(input)).success, true)
  assert.deepEqual(state.calls[0], [state.user, { phone: input.phone, currentPassword: input.currentPassword }])
  assert.equal((await verify(proof)).success, true)
  assert.deepEqual(state.calls[1], [state.user, { challengeId: proof.challengeId, code: proof.code }])
  assert.deepEqual(state.paths, ['/account', '/admin/users'])
  assert.equal((await request({ ...input, phone: 'wrong' })).success, false)
  state.fail = true
  assert.equal((await verify(proof)).success, false)
  assert.equal(state.calls.length, 2)
})
