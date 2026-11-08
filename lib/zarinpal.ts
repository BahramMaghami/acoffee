import 'server-only'
import { z } from 'zod'
import { PaymentError, type PaymentConfig, requireGatewayMinimum } from './payment-rules'

const authoritySchema = z.string().regex(/^[AS][a-zA-Z0-9]{35}$/)
const referenceSchema = z.union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive().max(Number.MAX_SAFE_INTEGER)]).transform(String)
export class GatewayError extends PaymentError {
  constructor(public readonly code: string, public readonly definite = false) { super('نتیجهٔ اتصال به درگاه مشخص نیست؛ وضعیت پرداخت را دوباره بررسی کن.') }
}
export function zarinpalGateway(config: PaymentConfig, transport: typeof fetch = fetch) {
  async function post(method: string, payload: Record<string, unknown>) {
    try {
      const response = await transport(`${config.gatewayOrigin}/pg/v4/payment/${method}.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ merchant_id: config.merchantId, ...payload }), cache: 'no-store', signal: AbortSignal.timeout(15000),
      })
      const body = await response.json()
      const rejected = z.object({ errors: z.object({ code: z.number().int().negative() }) }).safeParse(body)
      if (rejected.success) throw new GatewayError(`GATEWAY_${rejected.data.errors.code}`, true)
      if (!response.ok) throw new GatewayError(`HTTP_${response.status}`)
      return body
    } catch (error) { if (error instanceof GatewayError) throw error; throw new GatewayError('NETWORK_OR_INVALID_RESPONSE') }
  }
  function authority(value: string) {
    if (!authoritySchema.safeParse(value).success || value[0] !== (config.environment === 'SANDBOX' ? 'S' : 'A')) throw new GatewayError('INVALID_AUTHORITY')
    return value
  }
  return {
    async request(input: { amountRial: number; orderId: string; phone: string }) {
      requireGatewayMinimum(input.amountRial)
      const body = await post('request', { amount: input.amountRial, currency: 'IRR',
        description: `سفارش آ ${input.orderId}`, callback_url: `${config.origin}/api/payments/zarinpal/callback`,
        metadata: { mobile: input.phone, order_id: input.orderId, auto_verify: false } })
      const result = z.object({ data: z.object({ code: z.literal(100), authority: authoritySchema }) }).safeParse(body)
      if (!result.success) throw new GatewayError('INVALID_REQUEST_RESPONSE')
      return authority(result.data.data.authority)
    },
    redirect(value: string) { return `${config.gatewayOrigin}/pg/StartPay/${authority(value)}` },
    async verify(value: string, amountRial: number) {
      const body = await post('verify', { authority: authority(value), amount: amountRial })
      const result = z.object({ data: z.object({ code: z.union([z.literal(100), z.literal(101)]), ref_id: referenceSchema }) }).safeParse(body)
      if (!result.success) throw new GatewayError('INVALID_VERIFY_RESPONSE')
      return { referenceId: result.data.data.ref_id, code: result.data.data.code }
    },
    async inquiry(value: string) {
      const body = await post('inquiry', { authority: authority(value) })
      const result = z.object({ data: z.object({ code: z.literal(100), status: z.enum(['VERIFIED', 'PAID', 'IN_BANK', 'FAILED', 'REVERSED']) }) }).safeParse(body)
      if (!result.success) throw new GatewayError('INVALID_INQUIRY_RESPONSE')
      return result.data.data.status
    },
  }
}
export type PaymentGateway = ReturnType<typeof zarinpalGateway>
