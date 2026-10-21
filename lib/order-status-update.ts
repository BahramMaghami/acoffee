import type { OrderStatus, PaymentStatus } from '@/generated/prisma/client'

type CurrentState = { paymentStatus: PaymentStatus; status: OrderStatus; paidAt: Date | null; deliveredAt: Date | null }

export function orderStatusUpdate(current: CurrentState, field: 'paid' | 'delivered', value: boolean, now: Date) {
  if (field === 'paid') {
    return {
      paymentStatus: value ? 'PAID' as const : current.paymentStatus === 'PAID' ? 'UNPAID' as const : current.paymentStatus,
      paidAt: value ? (current.paymentStatus === 'PAID' ? current.paidAt ?? now : now) : null,
    }
  }
  return {
    status: value ? 'DELIVERED' as const : current.status === 'DELIVERED' ? 'PENDING' as const : current.status,
    deliveredAt: value ? (current.status === 'DELIVERED' ? current.deliveredAt ?? now : now) : null,
  }
}
