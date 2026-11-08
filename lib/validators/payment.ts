import { z } from 'zod'
export const orderPaymentSchema = z.object({ orderId: z.string().cuid() })
export const manualPaymentSchema = orderPaymentSchema.extend({
  expectedUpdatedAt: z.iso.datetime(),
  note: z.string().trim().min(5, 'دلیل و توضیح پرداخت را بنویس.').max(500),
  reference: z.string().trim().max(100).optional(),
})
export const voidManualPaymentSchema = manualPaymentSchema.omit({ reference: true }).extend({ paymentId: z.string().cuid() })
