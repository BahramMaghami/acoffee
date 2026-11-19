import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'

// Shared by the application and administrative scripts. Never fall back to
// driver defaults when a URL is missing, and never include credentials in errors.
export function databaseTransport(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required.')
  let url: URL
  try { url = new URL(connectionString) } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new Error('DATABASE_URL must specify a PostgreSQL host and database.')
  }
  return url.hostname.endsWith('.neon.tech') ? 'neon' : 'postgres'
}

export function createDatabaseAdapter(connectionString = process.env.DATABASE_URL) {
  const transport = databaseTransport(connectionString)
  const config = { connectionString, connectionTimeoutMillis: 10_000, max: 5 }
  return transport === 'neon' ? new PrismaNeon(config) : new PrismaPg(config)
}
