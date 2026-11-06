import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDiscountCodeSchema, discountCodeTextSchema } from '../../lib/validators/discount-codes'
import { couponAmount, checkDiscountEligibility } from '../../lib/discount-code-rules'

test('coupon fields normalize Persian digits and reject invalid limits and percentages', () => {
  const raw = { type: 'PERCENT', value: '۲۰', maxUsers: '۱۰', maxUsesPerUser: '۲', validDays: '۷' }
  assert.deepEqual(createDiscountCodeSchema.parse(raw), { type: 'PERCENT', value: 20, maxUsers: 10, maxUsesPerUser: 2, validDays: 7 })
  for (const key of ['value', 'maxUsers', 'maxUsesPerUser', 'validDays']) for (const invalid of ['0', '-1', '1.5', 'abc', '']) assert.equal(createDiscountCodeSchema.safeParse({ ...raw, [key]: invalid }).success, false)
  assert.equal(createDiscountCodeSchema.safeParse({ ...raw, value: '101' }).success, false)
  assert.equal(createDiscountCodeSchema.safeParse({ ...raw, type: 'FIXED', value: '۱۰۰٬۰۰۰' }).success, true)
  assert.equal(discountCodeTextSchema.parse(' abcd234567 '), 'ABCD234567')
})

test('N distinct users and M uses per account are independent limits', () => {
  const code = { type: 'PERCENT' as const, value: 20, maxUsers: 2, maxUsesPerUser: 3, isActive: true, expiresAt: new Date('2030-01-01') }
  const now = new Date('2026-11-06')
  assert.doesNotThrow(() => checkDiscountEligibility(code, { users: 2, userUses: 2 }, now))
  assert.throws(() => checkDiscountEligibility(code, { users: 2, userUses: 0 }, now), /ظرفیت/)
  assert.throws(() => checkDiscountEligibility(code, { users: 1, userUses: 3 }, now), /تعداد/)
  assert.throws(() => checkDiscountEligibility({ ...code, isActive: false }, { users: 0, userUses: 0 }, now), /غیرفعال/)
  assert.throws(() => checkDiscountEligibility(code, { users: 0, userUses: 0 }, code.expiresAt), /مهلت/)
})

test('coupon discounts stack on payable subtotal, exclude shipping, and cannot make totals negative', () => {
  assert.equal(couponAmount(800000, 'PERCENT', 10), 80000)
  assert.equal(couponAmount(101, 'PERCENT', 50), 51)
  assert.equal(couponAmount(800000, 'FIXED', 900000), 800000)
  assert.equal(couponAmount(800000, 'PERCENT', 100), 800000)
  assert.equal(800000 - couponAmount(800000, 'PERCENT', 10) + 50000, 770000)
  assert.throws(() => couponAmount(1, 'PERCENT', 1))
  assert.throws(() => couponAmount(100, 'PERCENT', 101))
})
