import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paymentConfig, tomanToRial, requireGatewayMinimum, canDeleteFinancialOrder } from '../../lib/payment-rules'
import { manualPaymentSchema } from '../../lib/validators/payment'
const env = { ZARINPAL_SANDBOX: 'true', ZARINPAL_MERCHANT_ID: 'f58f584a-2d2a-4daa-974a-8259d22ba8e6', PAYMENT_BASE_URL: 'http://localhost:3000' }
test('payment config fails closed and only allows local HTTP in sandbox', () => {
  assert.equal(paymentConfig(env).environment, 'SANDBOX')
  assert.equal(paymentConfig({ ...env, ZARINPAL_SANDBOX: 'false', PAYMENT_BASE_URL: 'https://acoffeeroasters.com' }).environment, 'LIVE')
  for (const change of [{ ZARINPAL_SANDBOX: '' }, { ZARINPAL_SANDBOX: 'TRUE' }, { ZARINPAL_MERCHANT_ID: '' },
    { PAYMENT_BASE_URL: 'http://example.com' }, { PAYMENT_BASE_URL: 'https://user:pass@example.com' }, { PAYMENT_BASE_URL: 'https://example.com/path' }, { ZARINPAL_SANDBOX: 'false' }]) {
    assert.throws(() => paymentConfig({ ...env, ...change }))
  }
})
test('payment amounts use exact integer rials, enforce minimum and preserve zero', () => {
  assert.equal(tomanToRial(3250000), 32500000); assert.equal(tomanToRial(0), 0)
  for (const value of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => tomanToRial(value))
  requireGatewayMinimum(0); requireGatewayMinimum(10000); assert.throws(() => requireGatewayMinimum(9990))
})
test('financial order deletion and manual input cannot bypass ledger safety', () => {
  for (const p of [{ method: 'ZARINPAL', status: 'UNKNOWN' }, { method: 'ZARINPAL', status: 'SUCCEEDED' }, { method: 'MANUAL', status: 'VOIDED' }])
    assert.equal(canDeleteFinancialOrder({ paymentStatus: 'UNPAID', payments: [p] }), false)
  assert.equal(canDeleteFinancialOrder({ paymentStatus: 'PAID', payments: [] }), false)
  assert.equal(canDeleteFinancialOrder({ paymentStatus: 'FAILED', payments: [{ method: 'ZARINPAL', status: 'FAILED' }] }), true)
  const input = { orderId: 'clabcdefg00000123456789012', expectedUpdatedAt: new Date().toISOString(), note: 'دریافت وجه', amount: 1, actorId: 'forged' }
  const parsed = manualPaymentSchema.parse(input)
  assert.equal('amount' in parsed, false); assert.equal('actorId' in parsed, false)
  assert.equal(manualPaymentSchema.safeParse({ ...input, note: '' }).success, false)
})
