"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

export interface PostSummary {
  id: string;
  title: string;
  status: string;
}

interface PostPickerProps {
  onSelect: (post: PostSummary) => void;
  placeholder?: string;
}

/** Debounced post search with dropdown results. */
export default function PostPicker({ onSelect, placeholder }: PostPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const emptyQuery = query.trim() === "";

  useEffect(() => {
    const q = query.trim();
    if (!q) return; // empty query → dropdown hidden at render time, no state churn
    // All state updates happen inside the debounced timer / fetch callbacks —
    // never synchronously in the effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/posts?q=${encodeURIComponent(q)}&pageSize=8`)
        .then((r) => r.json())
        .then((d) => {
          setResults(
            (d.items ?? []).map((p: PostSummary) => ({
              id: p.id,
              title: p.title,
              status: p.status,
            }))
          );
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative flex-1">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "جستجوی عنوان پست..."}
          className="w-full border border-zinc-300 rounded-lg bg-white px-3 py-2 pl-8 text-sm focus:outline-none focus:border-petro-brand focus:ring-2 focus:ring-petro-brand/20"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </span>
      </div>
      {(open && !emptyQuery) && (
        <ul className="absolute z-30 top-full mt-1 right-0 left-0 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-zinc-500">نتیجه‌ای یافت نشد</li>
          ) : (
            results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-petro-brand-soft hover:text-petro-brand-ink leading-relaxed"
                >
                  {p.title}
                  {p.status !== "PUBLISHED" && (
                    <span className="mr-2 text-[10px] text-amber-600">
                      ({p.status === "DRAFT" ? "پیش‌نویس" : "زمان‌بندی"})
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
