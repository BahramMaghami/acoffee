import 'server-only'

import { createDatabaseAdapter } from './database-adapter'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

function createDb() {
  const adapter = createDatabaseAdapter()

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
