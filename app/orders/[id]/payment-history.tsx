import type { PaymentAttempt } from '@/generated/prisma/client'
import { formatPersianDateTime } from '@/lib/date'
import { paymentStateLabels, paymentMethodLabels } from '@/lib/payment-rules'

export function PaymentHistory({ payments, admin = false }: { payments: PaymentAttempt[]; admin?: boolean }) {
  if (!payments.length) return null
  return <div className="payment-history">
    {payments.map(payment => <article key={payment.id}>
      <strong>{paymentMethodLabels[payment.method]} · {paymentStateLabels[payment.status]}</strong>
      {payment.environment === 'SANDBOX' && <p>آزمایشی — وجه واقعی دریافت نشده است</p>}
      <p><time dateTime={payment.createdAt.toISOString()}>{formatPersianDateTime(payment.createdAt)}</time></p>
      {payment.referenceId && <p>شمارهٔ پیگیری / رسید: <bdi>{payment.referenceId}</bdi></p>}
      {payment.settledAt && <p>زمان تسویه: {formatPersianDateTime(payment.settledAt)}</p>}
      {admin && payment.actorName && <p>ثبت مدیر: {payment.actorName} · {payment.note}</p>}
      {admin && payment.voidedAt && <p>ابطال: {payment.voidedByName} · {formatPersianDateTime(payment.voidedAt)} · {payment.voidReason}</p>}
    </article>)}
  </div>
}
