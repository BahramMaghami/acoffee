import { test } from 'node:test'
import assert from 'node:assert/strict'
import { owner, admin, paymentFixture, sandboxConfig } from '../helpers/payment-fixture'
import { paymentService } from '../../lib/payments'
import { canDeleteFinancialOrder, paymentLifetimeMs } from '../../lib/payment-rules'

test('one attempt, one settlement and one coupon use under concurrent starts and repeated callbacks', async () => {
  const f = paymentFixture({ coupon: true })
  const starts = await Promise.all([f.service.begin('order', owner), f.service.begin('order', owner)])
  assert.equal(f.state.requests, 1); assert.equal(f.state.payments.length, 1)
  assert.ok(starts.some(s => s.redirectUrl)); assert.equal(f.state.redemptions.length, 0)
  const callbacks = await Promise.all([f.service.check('order'), f.service.check('order')])
  assert.ok(callbacks.some(c => c.status === 'SUCCEEDED'))
  assert.equal(f.state.verifies, 1); assert.equal(f.state.order.paymentStatus, 'PAID')
  assert.equal(f.state.redemptions.length, 1); assert.equal(f.state.reservation?.status, 'CONSUMED')
  const paidAt = f.state.order.paidAt
  await f.service.check('order'); await f.service.begin('order', owner)
  assert.equal(f.state.requests, 1); assert.equal(f.state.verifies, 1)
  assert.deepEqual(f.state.order.paidAt, paidAt)
})
test('DB loss after successful verify retains reservation and recovers with code 101', async () => {
  const f = paymentFixture({ coupon: true })
  await f.service.begin('order', owner)
  f.state.failSettlement = true
  assert.equal((await f.service.check('order')).status, 'UNKNOWN')
  assert.equal(f.state.reservation?.status, 'ACTIVE'); assert.equal(f.state.redemptions.length, 0)
  await assert.rejects(f.service.manual('order', admin, { expectedUpdatedAt: f.state.order.updatedAt.toISOString(), note: 'manual' }), /جریان/)
  assert.equal((await f.service.begin('order', owner)).status, 'UNKNOWN')
  assert.equal(f.state.requests, 1)
  f.state.failSettlement = false
  assert.equal((await f.service.check('order')).status, 'SUCCEEDED')
  assert.equal(f.state.verifies, 2); assert.equal(f.state.redemptions.length, 1)
})
test('expired holds remain reserved while in bank or offline; confirmed failure releases quota and requires a new quote', async () => {
  const f = paymentFixture({ coupon: true })
  await f.service.begin('order', owner); f.advance(paymentLifetimeMs + 1)
  f.state.bank = 'IN_BANK'
  assert.equal((await f.service.check('order')).status, 'PENDING')
  assert.equal(f.state.reservation?.status, 'ACTIVE')
  f.gateway.inquiry = async () => { throw Error('offline') }
  assert.equal((await f.service.check('order')).status, 'UNKNOWN')
  assert.equal(f.state.reservation?.status, 'ACTIVE')
  f.gateway.inquiry = async () => 'FAILED'
  assert.equal((await f.service.check('order')).status, 'FAILED')
  assert.equal(f.state.reservation?.status, 'RELEASED'); assert.equal(f.state.verifies, 0)
  await assert.rejects(f.service.begin('order', owner), /قیمت روز/)
  f.gateway.inquiry = async () => 'PAID'
  await f.service.check('order')
  assert.equal(f.state.verifies, 0)
})
test('zero amount settles without a gateway request and manual corrections retain their audit and coupon use', async () => {
  const free = paymentFixture({ coupon: true, total: 0 })
  assert.equal((await free.service.begin('order', owner)).status, 'SUCCEEDED')
  assert.equal(free.state.requests, 0); assert.equal(free.state.payments[0].method, 'DISCOUNT')
  assert.equal(free.state.redemptions.length, 1)
  const f = paymentFixture({ coupon: true })
  const input = { expectedUpdatedAt: f.state.order.updatedAt.toISOString(), note: 'دریافت کارت به کارت', reference: 'receipt' }
  await assert.rejects(f.service.manual('order', owner, input), /دسترسی/)
  await f.service.manual('order', admin, input)
  assert.equal(f.state.payments[0].actorId, admin.id)
  await assert.rejects(f.service.manual('order', admin, input), /تغییر/)
  await f.service.voidManual('order', admin, { paymentId: f.state.payments[0].id, expectedUpdatedAt: f.state.order.updatedAt.toISOString(), note: 'ثبت اشتباه بود' })
  assert.equal(f.state.order.paymentStatus, 'UNPAID'); assert.equal(f.state.payments[0].status, 'VOIDED')
  assert.equal(f.state.payments[0].voidReason, 'ثبت اشتباه بود'); assert.equal(f.state.redemptions.length, 1)
  assert.equal(canDeleteFinancialOrder({ ...f.state.order, payments: f.state.payments }), false)
})
test('ownership, revoked sessions, environments, stale prices and minimum amount are enforced before gateway calls', async () => {
  const f = paymentFixture()
  await assert.rejects(f.service.begin('order', { id: 'intruder', sessionVersion: 0 }), /دسترسی/)
  f.state.version = 1; await assert.rejects(f.service.begin('order', owner), /دسترسی/); f.state.version = 0
  const live = paymentService(f.db, { ...sandboxConfig, environment: 'LIVE' }, f.gateway)
  await assert.rejects(live.begin('order', owner), /محیط/)
  f.state.order.paymentEnvironment = null; await assert.rejects(f.service.begin('order', owner), /قیمت روز/)
  f.state.order.paymentEnvironment = 'SANDBOX'; f.advance(paymentLifetimeMs + 1)
  assert.equal((await f.service.begin('order', owner)).status, 'EXPIRED')
  const tiny = paymentFixture({ total: 999 }); await assert.rejects(tiny.service.begin('order', owner), /حداقل/)
  assert.equal(f.state.requests, 0); assert.equal(tiny.state.requests, 0)
})
test('late payments with a still-held reservation settle; a released reservation can never be verified', async () => {
  const f = paymentFixture({ coupon: true })
  await f.service.begin('order', owner); f.advance(paymentLifetimeMs * 2)
  assert.equal((await f.service.check('order')).status, 'SUCCEEDED')
  const blocked = paymentFixture({ coupon: true })
  await blocked.service.begin('order', owner)
  blocked.state.reservation!.status = 'RELEASED'
  assert.equal((await blocked.service.check('order')).status, 'UNKNOWN')
  assert.equal(blocked.state.verifies, 0)
})

test('interrupted request never redirects to an unrecorded authority and cannot leave a second payable attempt', async () => {
  const f = paymentFixture({ coupon: true })
  f.gateway.request = async () => { throw Error('request timed out before receiving authority') }
  assert.equal((await f.service.begin('order', owner)).status, 'FAILED')
  assert.equal(f.state.reservation?.status, 'RELEASED')
  await assert.rejects(f.service.begin('order', owner), /قیمت روز/)
  assert.equal(f.state.payments.length, 1)
  const interrupted = paymentFixture({ coupon: true })
  const original = interrupted.db.paymentAttempt.updateMany
  interrupted.db.paymentAttempt.updateMany = (() => { throw Error('failed to persist authority') }) as typeof original
  await assert.rejects(interrupted.service.begin('order', owner), /persist/)
  interrupted.db.paymentAttempt.updateMany = original
  assert.equal(interrupted.state.payments[0].authority, null)
  assert.equal((await interrupted.service.begin('order', owner)).redirectUrl, undefined)
  interrupted.advance(61000)
  assert.equal((await interrupted.service.check('order')).status, 'EXPIRED')
  assert.equal(interrupted.state.reservation?.status, 'RELEASED')
  assert.equal(interrupted.state.verifies, 0)
})
