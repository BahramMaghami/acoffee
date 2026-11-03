import 'server-only'
import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'

export class SmsRateLimitError extends Error {}

// Retain signup keys so signup and account verification share phone/global quotas.
export async function reserveSmsQuota(tx: Prisma.TransactionClient, email: string, phone: string) {
  const limits = [
    { identity: `email-hour:${email}`, seconds: 3600, limit: 20 },
    { identity: `phone-hour:${phone}`, seconds: 3600, limit: 20 },
    { identity: 'all-day', seconds: 86400, limit: 200 },
  ].map(item => ({ ...item, key: createHash('sha256').update(`signup-otp:${item.identity}`).digest('hex') }))
    .sort((a, b) => a.key.localeCompare(b.key))
  for (const item of limits) {
    const [row] = await tx.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "AuthRateLimit" ("key", "attempts", "resetsAt")
      VALUES (${item.key}, 1, CURRENT_TIMESTAMP + make_interval(secs => ${item.seconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
        "resetsAt" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + make_interval(secs => ${item.seconds}) ELSE "AuthRateLimit"."resetsAt" END
      RETURNING "attempts"`
    if (!row || row.attempts > item.limit) throw new SmsRateLimitError('سقف درخواست پیامک پر شده است. بعداً دوباره تلاش کن.')
  }
}
