import { isActivePayment, paymentConfig, paymentStateLabels } from './payment-rules'
import type { Order, PaymentAttempt } from '@/generated/prisma/client'

export function paymentView(order: Order & { payments: PaymentAttempt[] }) {
  let environment: string | null = null
  try { environment = paymentConfig().environment } catch { /* Payment controls stay disabled. */ }
  const settled = order.paymentStatus === 'PAID'
  const active = order.payments.some(p => isActivePayment(p.status))
  const latest = order.payments[0]
  const matching = Boolean(environment && order.paymentEnvironment === environment)
  const fresh = Boolean(matching && order.paymentExpiresAt && order.paymentExpiresAt > new Date() && !order.supersededAt)
  const blocked = order.status === 'CANCELLED' || order.paymentStatus === 'REFUNDED'
  return {
    settled, active,
    enabled: Boolean(environment && (!order.paymentEnvironment || matching)),
    canStart: !settled && !blocked && fresh && (!latest || (latest.status === 'PENDING' && !latest.verificationStartedAt)),
    canReprice: !settled && !blocked && !active,
    canManual: !settled && !blocked && fresh && !active && !order.payments.some(p => p.method === 'ZARINPAL') && Number(order.total) > 0,
    label: latest ? paymentStateLabels[latest.status] : settled ? 'تسویه‌شده' : 'در انتظار پرداخت',
  }
}
