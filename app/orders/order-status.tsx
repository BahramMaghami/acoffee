import type { OrderStatus, PaymentStatus } from '@/generated/prisma/client'
import { CreditCard, Truck } from 'lucide-react'
import { paymentLabels, shippingLabels } from '@/lib/order-status'

export function OrderStatuses({
  payment,
  shipping,
}: {
  payment: PaymentStatus
  shipping: OrderStatus
}) {
  return (
    <dl className="order-history-statuses">
      <div data-complete={payment === 'PAID'}>
        <dt>
          <CreditCard size={16} aria-hidden="true" />
          پرداخت
        </dt>
        <dd>{paymentLabels[payment]}</dd>
      </div>
      <div data-complete={shipping === 'SHIPPED' || shipping === 'DELIVERED'}>
        <dt>
          <Truck size={16} aria-hidden="true" />
          ارسال
        </dt>
        <dd>{shippingLabels[shipping]}</dd>
      </div>
    </dl>
  )
}
