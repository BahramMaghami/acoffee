import { z } from 'zod'

export const adminUserMutationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('delete'), userId: z.string().cuid() }),
  z.object({ operation: z.literal('role'), userId: z.string().cuid(), role: z.enum(['ADMIN', 'CUSTOMER']) }),
])

export function usersPage(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}
