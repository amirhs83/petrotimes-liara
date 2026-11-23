// Local-dev database helper.
//
// The canonical schema (prisma/schema.prisma) targets PostgreSQL — the
// production database (Neon / Liara). This sandbox machine has no Postgres
// service, so for local development we derive a SQLite variant:
//   provider "postgresql" → "sqlite"
//   strip Postgres-native type hints (@db.VarChar(...))
// Enums, Json, indexes, createMany — all supported by Prisma 6 on SQLite.
//
// Usage: bun run db:local:push
// The generated Prisma client is identical (same models); production builds
// regenerate from the canonical schema via `prisma generate`.

import fs from "node:fs";

const src = fs.readFileSync("prisma/schema.prisma", "utf8");

const local = src
  .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
  .replace(/\s*@db\.VarChar\(\d+\)/g, "");

fs.writeFileSync("prisma/schema.local.prisma", local);
console.log("[db-local] wrote prisma/schema.local.prisma (sqlite variant)");
