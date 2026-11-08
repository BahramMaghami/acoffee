import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zarinpalGateway, GatewayError } from '../../lib/zarinpal'
import { paymentConfig } from '../../lib/payment-rules'
const config = paymentConfig({ ZARINPAL_SANDBOX: 'true', ZARINPAL_MERCHANT_ID: 'f58f584a-2d2a-4daa-974a-8259d22ba8e6', PAYMENT_BASE_URL: 'http://localhost:3000' })
const authority = 'S' + 'a'.repeat(35)
test('gateway sends stored rials, explicit manual verification and fixed callback, validates provider responses', async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = []
  const gateway = zarinpalGateway(config, async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    assert.ok(init?.signal)
    return Response.json({ data: String(url).includes('request') ? { code: 100, authority } : String(url).includes('inquiry') ? { code: 100, status: 'PAID' } : { code: 101, ref_id: 12345 } })
  })
  assert.equal(await gateway.request({ amountRial: 32500000, orderId: 'order', phone: '09121234567' }), authority)
  assert.equal(requests[0].body.amount, 32500000); assert.equal(requests[0].body.currency, 'IRR')
  assert.equal(requests[0].body.callback_url, 'http://localhost:3000/api/payments/zarinpal/callback')
  assert.equal((requests[0].body.metadata as Record<string, unknown>).auto_verify, false)
  assert.equal(await gateway.inquiry(authority), 'PAID')
  assert.deepEqual(await gateway.verify(authority, 32500000), { code: 101, referenceId: '12345' })
  assert.equal(requests[2].body.amount, requests[0].body.amount)
  assert.equal(gateway.redirect(authority), `https://sandbox.zarinpal.com/pg/StartPay/${authority}`)
  assert.throws(() => gateway.redirect('A' + 'a'.repeat(35)))
})
test('malformed, rejected and timed out gateway replies cannot become a success', async () => {
  for (const body of [{ data: { code: 100, ref_id: Number.MAX_SAFE_INTEGER + 1 } }, { data: { code: 100 } }, { data: { code: 200, ref_id: 1 } }, { errors: { code: -51 } }]) {
    const gateway = zarinpalGateway(config, async () => Response.json(body))
    await assert.rejects(gateway.verify(authority, 10000), GatewayError)
  }
  const offline = zarinpalGateway(config, async () => { throw Error('timeout') })
  await assert.rejects(offline.inquiry(authority), error => error instanceof GatewayError && error.code === 'NETWORK_OR_INVALID_RESPONSE' && !error.definite)
})
