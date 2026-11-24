"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf-client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PostPicker, { type PostSummary } from "@/components/admin/post-picker";
import { homeSectionLabel } from "@/components/admin/home-section-label";
import {
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

interface Slot {
  /** stable unique id per slot (a post may occupy several slots) */
  uid: string;
  postId: string;
  title: string;
  status: string;
  thumb?: string | null;
}

interface SectionDto {
  key: string;
  name: string;
  capacity: number;
  placements: {
    position: number;
    post: { id: string; title: string; status: string; homeImage?: { url: string } | null };
  }[];
}

/** Serializes slots for dirty comparison. */
function fingerprint(slots: Slot[]): string {
  return JSON.stringify(slots.map((s) => `${s.postId}@${s.title}`));
}

let uidSeq = 0;
function nextUid(): string {
  uidSeq += 1;
  return `slot-${uidSeq}`;
}

export default function SectionsPage() {
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * Hydrates slots/initial from server data.
   * replace=true (initial load / reset): rebuilds the whole map.
   * replace=false (after saving one section): merges — other sections'
   * client state must survive a single-section save.
   */
  const applySections = useCallback((items: SectionDto[], replace = false) => {
    const map: Record<string, Slot[]> = {};
    const fp: Record<string, string> = {};
    for (const s of items) {
      const list = [...s.placements]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          uid: nextUid(),
          postId: p.post.id,
          title: p.post.title,
          status: p.post.status,
          thumb: p.post.homeImage?.url ?? null,
        }));
      map[s.key] = list;
      fp[s.key] = fingerprint(list);
    }
    if (replace) {
      setSlots(map);
      setInitial(fp);
    } else {
      setSlots((prev) => ({ ...prev, ...map }));
      setInitial((prev) => ({ ...prev, ...fp }));
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/sections")
      .then((r) => r.json())
      .then((d) => {
        const items: SectionDto[] = d.items ?? [];
        setSections(items);
        applySections(items, true);
      })
      .catch(() => toast.error("بارگذاری بخش‌ها ناموفق بود"))
      .finally(() => setLoading(false));
  }, [applySections]);

  useEffect(() => load(), [load]);

  const dirty = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of sections) {
      map[s.key] = fingerprint(slots[s.key] ?? []) !== initial[s.key];
    }
    return map;
  }, [sections, slots, initial]);

  function updateSection(key: string, next: Slot[]) {
    setSlots((m) => ({ ...m, [key]: next }));
  }

  function addSlot(key: string, post: PostSummary) {
    const current = slots[key] ?? [];
    updateSection(key, [
      ...current,
      {
        uid: nextUid(),
        postId: post.id,
        title: post.title,
        status: post.status,
        thumb: null,
      },
    ]);
    toast.success("به انتهای بخش اضافه شد — با کشیدن جای آن را مشخص کنید");
  }

  function removeSlot(key: string, index: number) {
    updateSection(
      key,
      (slots[key] ?? []).filter((_, i) => i !== index)
    );
  }

  function onDragEnd(key: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = slots[key] ?? [];
    const from = list.findIndex((s) => s.uid === active.id);
    const to = list.findIndex((s) => s.uid === over.id);
    if (from < 0 || to < 0) return;
    updateSection(key, arrayMove(list, from, to));
  }

  async function save(key: string) {
    setSaving(key);
    try {
      const res = await apiFetch(`/api/admin/sections/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placements: (slots[key] ?? []).map((s, i) => ({
            postId: s.postId,
            position: i + 1,
          })),
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) throw new Error(d?.error ?? "ذخیره ناموفق بود");
      toast.success("چیدمان ذخیره شد");
      const section = d.section as SectionDto | undefined;
      if (section) {
        setSections((prev) => prev.map((s) => (s.key === key ? section : s)));
        applySections([section]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin inline-block ml-2" />
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">چیدمان صفحه اصلی</h1>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          هر خبر یک جایگاه ثابت در صفحه اصلی دارد؛ عنوان بخش بالای آن نمایش داده
          می‌شود. برای تغییر ترتیب، خبر را با دستگیره سمت راست بکشید و رها کنید
          (یا با کیبورد: Space برای برداشتن، فلش‌ها برای جابه‌جایی و Space برای
          رها کردن). موقعیت‌ها پس از ذخیره از ۱ تا n شماره‌گذاری می‌شوند.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {sections.map((s) => {
          const list = slots[s.key] ?? [];
          const isDirty = dirty[s.key];
          const over = list.length > s.capacity;
          return (
            <div
              key={s.key}
              className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
                isDirty ? "border-petro-brand-line shadow-sm" : "border-zinc-200"
              }`}
            >
              {/* card header */}
              <div className="flex items-center justify-between gap-3 bg-zinc-50 border-b border-zinc-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-zinc-900 text-sm">
                      {homeSectionLabel(s.key, s.name)}
                    </h2>
                    <span
                      className={`text-[10px] rounded-full px-2 py-0.5 font-bold tabular-nums ${
                        over
                          ? "bg-amber-100 text-amber-700"
                          : "bg-petro-brand-soft text-petro-brand-ink"
                      }`}
                    >
                      {list.length} از {s.capacity}
                    </span>
                    {isDirty && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-bold bg-petro-brand text-white">
                        ذخیره نشده
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    ظرفیت نمایش: {s.capacity}
                    {over && " — موارد مازاد در سایت نمایش داده نمی‌شوند"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={load}
                      disabled={saving === s.key}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-300 hover:border-zinc-400 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-40"
                      title="بازگردانی به آخرین ذخیره‌شده"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      بازنشانی
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!isDirty || saving === s.key}
                    onClick={() => save(s.key)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-petro-brand hover:bg-petro-brand-bright disabled:opacity-40 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    {saving === s.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    ذخیره
                  </button>
                </div>
              </div>

              {/* slots */}
              <div className="p-3">
                {list.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">
                    هنوز پستی در این بخش قرار نگرفته — از کادر پایین اضافه کنید
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => onDragEnd(s.key, e)}
                  >
                    <SortableContext
                      items={list.map((x) => x.uid)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-2">
                        {list.map((slot, idx) => (
                          <SortableSlot
                            key={slot.uid}
                            slot={slot}
                            order={idx + 1}
                            onRemove={() => removeSlot(s.key, idx)}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}

                {/* add row */}
                <div className="flex items-center gap-2 pt-3 mt-1 border-t border-zinc-100">
                  <span className="text-zinc-400 flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                  <PostPicker
                    placeholder="افزودن پست به این بخش..."
                    onSelect={(post) => addSlot(s.key, post)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- sortable slot --- */

function SortableSlot({
  slot,
  order,
  onRemove,
}: {
  slot: Slot;
  order: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 bg-white transition-colors ${
        isDragging
          ? "border-petro-brand shadow-lg shadow-petro-brand/10 relative z-10"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      {/* drag handle */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="p-1 -m-1 text-zinc-400 hover:text-petro-brand cursor-grab active:cursor-grabbing touch-none"
        aria-label={`جابه‌جایی: ${slot.title}`}
        title="کشیدن برای جابه‌جایی"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* dense position */}
      <span className="w-6 h-6 rounded-md bg-petro-navy text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
        {order}
      </span>

      {/* thumb */}
      {slot.thumb ? (
        <img
          src={slot.thumb}
          alt=""
          aria-hidden="true"
          className="w-9 h-9 rounded-md object-cover flex-shrink-0 border border-zinc-200"
        />
      ) : (
        <span className="w-9 h-9 rounded-md bg-zinc-100 flex-shrink-0" aria-hidden="true" />
      )}

      <span className="flex-1 min-w-0 text-sm text-zinc-800 line-clamp-1">
        {slot.title}
        {slot.status !== "PUBLISHED" && (
          <span className="mr-1.5 text-[10px] text-amber-600 font-bold">
            ({slot.status === "DRAFT" ? "پیش‌نویس" : "زمان‌بندی"})
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
        title="حذف از بخش"
        aria-label={`حذف ${slot.title} از بخش`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
