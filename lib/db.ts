import 'server-only'

import { PrismaNeon } from '@prisma/adapter-neon'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Configure the Neon pooled URL in .env.',
    )
  }

  const adapter = new PrismaNeon({
    connectionString,
    connectionTimeoutMillis: 10_000,
    max: 5,
  })

  return new PrismaClient({
    adapter,
    omit: { user: { passwordHash: true } },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createDb> | undefined
  prismaClientSignature: string | undefined
}

// Separate Next.js bundles can load different constructor objects for the same
// generated client. Compare its version and model fields, not object identity.
const clientSignature = JSON.stringify([
  Prisma.prismaVersion.client,
  Object.entries(Prisma)
    .filter(([name]) => name.endsWith('ScalarFieldEnum'))
    .sort(([left], [right]) => left.localeCompare(right)),
])

// Initialize on first use so builds of public pages need no database connection.
export function getDb() {
  const cached = globalForPrisma.prisma
  // HMR preserves globals; added/removed model fields must invalidate the cache.
  if (
    cached &&
    (process.env.NODE_ENV !== 'development' ||
      globalForPrisma.prismaClientSignature === clientSignature)
  ) {
    return cached
  }

  const db = createDb()
  globalForPrisma.prisma = db
  globalForPrisma.prismaClientSignature = clientSignature
  if (cached) {
    void cached.$disconnect().catch(() => {
      console.error('[db] Failed to disconnect stale development client')
    })
  }
  return db
}
