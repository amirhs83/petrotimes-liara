import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      status: "healthy",
      db: "connected",
      storage: getStorageProvider(),
    });
  } catch (err) {
    console.error("[health] Database check failed:", err);
    return NextResponse.json(
      { ok: false, status: "unhealthy", db: "disconnected" },
      { status: 503 }
    );
  }
}
