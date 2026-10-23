import "dotenv/config";
import { defineConfig } from "prisma/config";

// Neon may need more than the default five seconds to establish a connection.
// Preserve an explicitly configured timeout and keep credentials in the env file.
function migrationUrl() {
  const value = process.env.DIRECT_URL;
  if (!value) return undefined;
  const url = new URL(value);
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", "15");
  }
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Schema validation and client generation work without database credentials.
  // Commands that connect to PostgreSQL require DIRECT_URL in .env.
  datasource: {
    url: migrationUrl(),
  },
});
