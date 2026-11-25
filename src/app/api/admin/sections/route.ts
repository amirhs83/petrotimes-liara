import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, isErrorResponse } from "@/lib/security";
import { ensureAdvertise1Section } from "@/lib/content/advertise1-section";

export const runtime = "nodejs";

// All homepage sections with their current placements (ordered by position)
export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (isErrorResponse(guard)) return guard.response;

  // idempotent bootstrap so the «ادورتایز 1» section (and the legacy energy
  // 4-6 placement move) is already in place when the panel loads
  await ensureAdvertise1Section().catch((err) =>
    console.error("[sections] advertise1 bootstrap failed:", err)
  );

  const sections = await db.homeSection.findMany({
    orderBy: { id: "asc" },
    include: {
      placements: {
        orderBy: { position: "asc" },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              status: true,
              publishedAt: true,
              homeImage: { select: { url: true } },
            },
          },
        },
      },
    },
  });

  // Present the panel in the homepage layout order (advertise1 was created
  // later, so plain id order would push it to the end of the grid).
  const LAYOUT_ORDER = [
    "hero",
    "videos",
    "feature",
    "magazine",
    "energy",
    "advertise1",
    "advertise",
  ];
  const filtered = sections.filter((s) => s.key !== "topnews");
  filtered.sort(
    (a, b) =>
      LAYOUT_ORDER.indexOf(a.key) - LAYOUT_ORDER.indexOf(b.key) ||
      a.key.localeCompare(b.key)
  );

  return NextResponse.json({ ok: true, items: filtered });
}
