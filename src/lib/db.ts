import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/* ---------------------------------------------------------------- retry ---
 *
 * SQLite (local dev) allows ONE writer at a time. While a seed/admin write
 * holds the file lock, concurrent reads throw SQLITE_BUSY (P2024 / "database
 * is locked"). The public queries below deliberately swallow errors into
 * empty results (graceful degradation) — without a retry that would turn a
 * transient lock into an empty render, and with ISR a cached 404 for up to
 * `revalidate` seconds (the observed "clicking a news item does nothing"
 * symptom). Retrying a couple of times with a short backoff absorbs those
 * transient locks. On PostgreSQL (production) locks behave differently and
 * Prisma waits per connection_pool timeout, so the retry is a no-op safety
 * net there.
 */
const BUSY_PATTERNS = [
  'SQLITE_BUSY',
  'database is locked',
  'database table is locked',
  'Timed out fetching connection',
  'P2024',
]

export function isTransientDbError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  return BUSY_PATTERNS.some((p) => msg.includes(p))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Run `fn`, retrying up to `attempts` times on transient (lock) errors.
 * Waits 150ms, then 350ms — enough to ride out a busy SQLite writer.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1 && isTransientDbError(err)) {
        await sleep(150 * (i + 1))
        continue
      }
      throw err
    }
  }
  throw lastErr
}