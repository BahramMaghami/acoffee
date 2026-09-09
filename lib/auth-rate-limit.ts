import 'server-only'
import { createHash } from 'node:crypto'
import { getDb } from './db'

export async function consumeAuthAttempt(
  email: string,
  operation: 'login' | 'register',
) {
  const key = createHash('sha256').update(`${operation}:${email}`).digest('hex')
  const limit = operation === 'login' ? 8 : 3
  const seconds = operation === 'login' ? 15 * 60 : 60 * 60

  // Atomic counters work across concurrent requests and multiple server instances.
  const [row] = await getDb().$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "resetsAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + make_interval(secs => ${seconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP
        THEN 1 ELSE LEAST("AuthRateLimit"."attempts" + 1, 1000000) END,
      "resetsAt" = CASE WHEN "AuthRateLimit"."resetsAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + make_interval(secs => ${seconds})
        ELSE "AuthRateLimit"."resetsAt" END
    RETURNING "attempts"
  `
  return Boolean(row && row.attempts <= limit)
}
