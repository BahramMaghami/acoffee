import { z } from 'zod'

const target = { orderId: z.string().cuid(), expectedUpdatedAt: z.iso.datetime() }
export const adminOrderSchema = z.discriminatedUnion('operation', [
  z.object({ ...target, operation: z.literal('delete') }),
  z.object({ ...target, operation: z.literal('status'), field: z.enum(['paid', 'delivered']), value: z.boolean() }),
])

export function adminOrdersPage(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}
