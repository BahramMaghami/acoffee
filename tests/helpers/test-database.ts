import 'dotenv/config'

export function testDatabaseUrls(env: Record<string, string | undefined> = process.env) {
  const pooled = env.TEST_DATABASE_URL
  const direct = env.TEST_DIRECT_URL
  if (!pooled || !direct) throw new Error('TEST_DATABASE_URL and TEST_DIRECT_URL are required. Never use the main database for tests.')
  function endpoint(raw: string) {
    try {
      const url = new URL(raw)
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech')) throw new Error()
      return { host: url.hostname.replace('-pooler.', '.'), database: url.pathname }
    } catch { throw new Error('Test database URL must identify a dedicated Neon branch.') }
  }
  const a = endpoint(pooled), b = endpoint(direct)
  if (a.host !== b.host || a.database !== b.database) throw new Error('Test URLs must point to the same Neon branch and database.')
  for (const main of [env.ACOFFEE_MAIN_DATABASE_URL ?? env.DATABASE_URL, env.ACOFFEE_MAIN_DIRECT_URL ?? env.DIRECT_URL]) {
    if (main && endpoint(main).host === a.host) throw new Error('Refusing tests against the main Neon endpoint.')
  }
  return { pooled, direct }
}

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL && process.env.TEST_DIRECT_URL)
