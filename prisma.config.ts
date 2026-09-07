import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Schema validation and client generation work without database credentials.
  // Commands that connect to PostgreSQL require DIRECT_URL in .env.
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
