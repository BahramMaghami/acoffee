import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Configure the Neon pooled URL in .env.");
  }

  const adapter = new PrismaNeon({
    connectionString,
    connectionTimeoutMillis: 10_000,
    max: 5,
  });

  return new PrismaClient({
    adapter,
    omit: { user: { passwordHash: true } },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createDb> | undefined;
};

// Initialize on first use so builds of public pages need no database connection.
export function getDb() {
  return (globalForPrisma.prisma ??= createDb());
}
