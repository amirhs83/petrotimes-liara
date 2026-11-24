/**
 * Runtime bootstrap for the «ادورتایز 1» homepage section.
 *
 * The three media tiles that close the ENERGY block used to be positions
 * 4-6 of the "energy" HomeSection (client: "باید توی پنل جدا باشه و جزو
 * انرژی نیست — اسمشم بزار ادورتایز 1"). They now live in their own
 * admin-managed HomeSection (key "advertise1").
 *
 * This module performs the one-time, fully-idempotent data bootstrap:
 *  1. creates the HomeSection row when missing;
 *  2. moves the legacy energy placements (positions 4-6) into advertise1
 *     positions 1-3 — ONLY while advertise1 is still empty, so any manual
 *     arrangement an admin has already made there is never overwritten;
 *  3. shrinks the informational energy capacity 6 → 3 (main + 2 subs;
 *     the grid tiles left the section) — only when still the legacy 6.
 *
 * It runs lazily (once per server process, retried on failure) from the
 * homepage data build and the admin sections API, so the section appears
 * in the admin panel and on the site without any manual migration step —
 * in the sandbox (SQLite) and on Liara/Neon (PostgreSQL) alike. No post
 * content is touched: only HomeSection/SectionPlacement rows move.
 */

import { db, withDbRetry } from "@/lib/db";

const SECTION_KEY = "advertise1";
const SECTION_NAME = "ادورتایز 1";
const SECTION_CAPACITY = 3;

let bootstrap: Promise<void> | null = null;

/** Runs the bootstrap once per process; a failed attempt is retried next call. */
export function ensureAdvertise1Section(): Promise<void> {
  bootstrap ??= run().catch((err) => {
    bootstrap = null; // allow a retry on the next request
    throw err;
  });
  return bootstrap;
}

async function run(): Promise<void> {
  // 1 — the section row itself
  let row = await withDbRetry(() =>
    db.homeSection.findUnique({ where: { key: SECTION_KEY } })
  );
  if (!row) {
    row = await withDbRetry(() =>
      db.homeSection.create({
        data: { key: SECTION_KEY, name: SECTION_NAME, capacity: SECTION_CAPACITY },
      })
    );
  }
  const section = row;

  // 2 — legacy migration: energy positions 4-6 → advertise1 1-3 (once)
  const owned = await withDbRetry(() =>
    db.sectionPlacement.count({ where: { sectionId: section.id } })
  );
  if (owned === 0) {
    const legacy = await withDbRetry(() =>
      db.sectionPlacement.findMany({
        where: { section: { key: "energy" }, position: { gte: 4, lte: 6 } },
        orderBy: { position: "asc" },
        select: { id: true, postId: true },
      })
    );
    if (legacy.length > 0) {
      await withDbRetry(() =>
        db.$transaction([
          db.sectionPlacement.deleteMany({
            where: { id: { in: legacy.map((p) => p.id) } },
          }),
          db.sectionPlacement.createMany({
            data: legacy.map((p, i) => ({
              sectionId: section.id,
              postId: p.postId,
              position: i + 1,
            })),
          }),
        ])
      );
    }
  }

  // 3 — energy capacity 6 → 3 (informational; only when still the legacy value)
  await withDbRetry(() =>
    db.homeSection.updateMany({
      where: { key: "energy", capacity: 6 },
      data: { capacity: SECTION_CAPACITY },
    })
  );
}
