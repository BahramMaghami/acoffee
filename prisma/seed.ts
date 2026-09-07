import "dotenv/config";

import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaNeon } from "@prisma/adapter-neon";
import { compare, hash } from "bcryptjs";
import { PrismaClient, Role } from "../generated/prisma/client";

const seedUsers = [
  { name: "admin", email: "admin@acoffee.test", role: Role.ADMIN },
  { name: "bahram", email: "bahram@acoffee.test", role: Role.CUSTOMER },
];

const credentialsPath = resolve(process.cwd(), ".seed-users.local.json");

async function readCredentials(): Promise<Record<string, string>> {
  try {
    const data: unknown = JSON.parse(await readFile(credentialsPath, "utf8"));
    if (
      !data || typeof data !== "object" || Array.isArray(data) ||
      !Object.values(data).every((value) => typeof value === "string" && value.length >= 16)
    ) {
      throw new Error("Invalid local seed credentials file.");
    }
    return data as Record<string, string>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required in .env.");

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString, connectionTimeoutMillis: 10_000 }),
  });

  try {
    const existing = await prisma.user.findMany({
      where: { email: { in: seedUsers.map((user) => user.email) } },
      select: { email: true, name: true, role: true },
    });

    // Never promote or overwrite an existing account with a matching email.
    for (const user of existing) {
      const expected = seedUsers.find((seed) => seed.email === user.email)!;
      if (user.role !== expected.role || user.name !== expected.name) {
        throw new Error(`Existing account ${user.email} differs from the seed; left unchanged.`);
      }
    }

    const credentials = await readCredentials();
    const missing = seedUsers.filter((user) => !existing.some((row) => row.email === user.email));
    for (const user of missing) {
      credentials[user.email] ??= randomBytes(24).toString("base64url");
    }

    // Persist passwords before writing to Neon, so a connection failure is retryable.
    if (missing.length > 0) {
      await writeFile(credentialsPath, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
      const data = await Promise.all(missing.map(async (user) => ({
        ...user,
        passwordHash: await hash(credentials[user.email], 12),
      })));
      await prisma.user.createMany({ data, skipDuplicates: true });
    }

    const users = await prisma.user.findMany({
      where: { email: { in: seedUsers.map((user) => user.email) } },
      select: { id: true, name: true, email: true, role: true, passwordHash: true },
      orderBy: { name: "asc" },
    });
    if (users.length !== seedUsers.length) throw new Error("Seed verification failed: missing users.");

    for (const user of users) {
      const expected = seedUsers.find((seed) => seed.email === user.email)!;
      if (user.role !== expected.role || user.name !== expected.name) {
        throw new Error(`Seed verification failed for ${user.email}.`);
      }
      const password = credentials[user.email];
      if (password && !await compare(password, user.passwordHash)) {
        throw new Error(`Local password for ${user.email} differs from the database; database password left unchanged.`);
      }
    }

    console.table(users.map(({ id, name, email, role }) => ({ id, name, email, role })));
    console.log(`Seed verified. Added ${missing.length} missing account(s); existing accounts unchanged.`);
    if (Object.keys(credentials).length > 0) {
      console.log("Initial passwords: .seed-users.local.json (ignored by Git).");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Do not log connection strings or query parameters on failure.
  const message = error instanceof Error ? error.message : "Unknown seed error";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[database URL redacted]"));
  process.exitCode = 1;
});
