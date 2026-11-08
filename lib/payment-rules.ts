import { z } from 'zod'

export const paymentLifetimeMs = 30 * 60 * 1000
export const paymentLeaseMs = 60 * 1000
export const activePaymentStates = ['REQUESTING', 'PENDING', 'VERIFYING', 'UNKNOWN'] as const
export class PaymentError extends Error {}
export type PaymentEnvironment = 'SANDBOX' | 'LIVE'
export type PaymentConfig = { environment: PaymentEnvironment; merchantId: string; origin: string; gatewayOrigin: string }

export function paymentConfig(env: Record<string, string | undefined> = process.env): PaymentConfig {
  const sandbox = env.ZARINPAL_SANDBOX
  if (!['true', 'false'].includes(sandbox ?? '') || !z.uuid().safeParse(env.ZARINPAL_MERCHANT_ID).success)
    throw new PaymentError('تنظیمات درگاه پرداخت کامل نیست؛ فعلاً امکان پرداخت وجود ندارد.')
  let base: URL
  try { base = new URL(env.PAYMENT_BASE_URL ?? '') } catch { throw new PaymentError('آدرس بازگشت پرداخت تنظیم نشده است.') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
    (base.protocol !== 'https:' && !(sandbox === 'true' && local && base.protocol === 'http:')))
    throw new PaymentError('آدرس پایهٔ پرداخت معتبر نیست.')
  return { environment: sandbox === 'true' ? 'SANDBOX' : 'LIVE', merchantId: env.ZARINPAL_MERCHANT_ID!, origin: base.origin,
    gatewayOrigin: sandbox === 'true' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com' }
}

export function tomanToRial(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new PaymentError('مبلغ سفارش معتبر نیست.')
  const rial = BigInt(amount) * BigInt(10)
  if (rial > BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentError('مبلغ سفارش بیش از حد مجاز است.')
  return Number(rial)
}
export function requireGatewayMinimum(rial: number) {
  if (rial > 0 && rial < 10000) throw new PaymentError('حداقل مبلغ پرداخت آنلاین ۱٬۰۰۰ تومان است؛ کد تخفیف یا سبد را تغییر بده.')
}
export function isActivePayment(status: string) { return (activePaymentStates as readonly string[]).includes(status) }
export function canDeleteFinancialOrder(order: { paymentStatus: string; payments: { method: string; status: string }[] }) {
  return !['PAID', 'REFUNDED'].includes(order.paymentStatus) && !order.payments.some(p => p.method === 'MANUAL' || p.status === 'SUCCEEDED' || isActivePayment(p.status))
}
export const paymentStateLabels: Record<string, string> = {
  REQUESTING: 'در حال اتصال به درگاه', PENDING: 'در انتظار پرداخت', VERIFYING: 'در حال تأیید پرداخت', UNKNOWN: 'در حال بررسی',
  SUCCEEDED: 'تسویه‌شده', FAILED: 'پرداخت ناموفق', EXPIRED: 'نیازمند بررسی قیمت روز', VOIDED: 'ثبت دستی ابطال شده',
}
export const paymentMethodLabels: Record<string, string> = { ZARINPAL: 'زرین‌پال', MANUAL: 'پرداخت خارج از درگاه', DISCOUNT: 'تسویه با تخفیف کامل' }
