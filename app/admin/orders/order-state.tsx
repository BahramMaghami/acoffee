import type { OrderStatus, PaymentStatus } from '@/generated/prisma/client'
import { formatPersianDateTime } from '@/lib/date'
import { paymentLabels, shippingLabels } from '@/lib/order-status'

export function AdminOrderState({ payment, status, paidAt, deliveredAt }: {
  payment: PaymentStatus; status: OrderStatus; paidAt: Date | null; deliveredAt: Date | null
}) {
  return <dl className="admin-order-state">
    <div data-complete={payment === 'PAID'}><dt>پرداخت</dt><dd>
      {payment === 'PAID' ? paidAt ? <time dateTime={paidAt.toISOString()}>{formatPersianDateTime(paidAt)}</time> : 'پرداخت‌شده؛ تاریخ ثبت نشده' : paymentLabels[payment]}
    </dd></div>
    <div data-complete={status === 'DELIVERED'}><dt>تحویل</dt><dd>
      {status === 'DELIVERED' ? deliveredAt ? <time dateTime={deliveredAt.toISOString()}>{formatPersianDateTime(deliveredAt)}</time> : 'تحویل‌شده؛ تاریخ ثبت نشده' : shippingLabels[status]}
    </dd></div>
  </dl>
}
