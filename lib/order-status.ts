import type { OrderStatus, PaymentStatus } from '@/generated/prisma/client'

export const paymentLabels: Record<PaymentStatus, string> = {
  PAID: 'پرداخت‌شده', UNPAID: 'پرداخت‌نشده', FAILED: 'پرداخت ناموفق', REFUNDED: 'مبلغ بازپرداخت شده',
}
export const shippingLabels: Record<OrderStatus, string> = {
  PENDING: 'ارسال‌نشده', PROCESSING: 'در حال آماده‌سازی', SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل داده شده', CANCELLED: 'سفارش لغو شده',
}
