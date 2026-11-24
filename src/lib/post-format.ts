// Display formatting helpers for posts on the public site (server-side).

export function faDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

export function faDate(d: Date): string {
  return d.toLocaleDateString("fa-IR");
}

export function faTime(d: Date): string {
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

export function faDateLong(d: Date): string {
  return d.toLocaleDateString("fa-IR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * "NOV 23, 2026 • 02:59 PM" — the Top News English meta line (en-US short
 * month, 12-hour clock, zero-padded hour, • separator). Rendered
 * server-side in the same timezone the Persian faDate/faTime lines use, so
 * both formats always show the identical wall-clock time.
 */
export function enDateLine(d: Date): string {
  const date = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} • ${time}`;
}

export function faViews(n: number): string {
  return n.toLocaleString("fa-IR");
}

/** seconds -> "m:ss" in Persian digits */
export function faDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return faDigits(`${m}:${String(s).padStart(2, "0")}`);
}
