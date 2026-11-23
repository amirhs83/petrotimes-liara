/**
 * Provider-aware text matching.
 *
 * Prisma's `mode: "insensitive"` is only supported on PostgreSQL (and
 * MongoDB). The local dev database is SQLite — passing `mode` there throws
 * PrismaClientValidationError. Persian text has no letter case, so
 * sensitivity only matters for embedded Latin words (OPEC, LNG, Barlow …):
 *  - PostgreSQL → { contains, mode: "insensitive" }
 *  - SQLite     → { contains } (ASCII case-insensitive by default)
 */
const isPostgres = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "");

export function containsInsensitive(value: string):
  | { contains: string; mode: "insensitive" }
  | { contains: string } {
  return isPostgres
    ? { contains: value, mode: "insensitive" as const }
    : { contains: value };
}
