"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  isToday, addWeeks, subWeeks, addMonths, subMonths, startOfMonth,
  endOfMonth, getDay, isSameMonth, addDays, subDays,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronLeft, ChevronRight, Check } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const HOUR_H = 72;
const START_H = 7;
const HOURS = Array.from({ length: 15 }, (_, i) => i + START_H);
const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const PLATFORM_COLOR: Record<string, string> = {
  telegram: "#3B82F6", instagram: "#EC4899",
  tiktok: "#10B981",  vk: "#8B5CF6", youtube: "#EF4444",
};
const TYPE_COLOR = { post: "#3B82F6", task: "#8B5CF6", campaign: "#F97316" };
const TYPE_BG   = { post: "#1e3a5f", task: "#2e1f5e", campaign: "#4a2000" };
const TYPE_LABEL = { post: "Пост", task: "Задача", campaign: "Кампания" };
const TYPE_ICON  = { post: "📝", task: "✅", campaign: "📢" };

type ViewType = "week" | "month" | "day" | "agenda";
type EventType = "post" | "task" | "campaign";
interface CalEvent {
  id: string; type: EventType; title: string;
  date: Date; endDate?: Date; color: string;
  platform?: string; status?: string; meta: any;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function eventTop(date: Date) {
  return ((date.getHours() + date.getMinutes() / 60 - START_H) * HOUR_H);
}
function eventHeight(date: Date, end?: Date) {
  if (!end) return HOUR_H;
  const mins = (end.getTime() - date.getTime()) / 60000;
  return Math.max(24, (mins / 60) * HOUR_H);
}
function statusLabel(s: string) {
  if (s === "published") return "Опубликовано";
  if (s === "failed")    return "Ошибка";
  if (s === "active")    return "Активна";
  if (s === "done")      return "Выполнено";
  return "Ожидает";
}
function statusColor(s: string) {
  if (s === "published" || s === "done" || s === "active") return "var(--pos)";
  if (s === "failed") return "var(--neg)";
  return "var(--tx-3)";
}

// ── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ current, onSelect, events }: {
  current: Date; onSelect: (d: Date) => void; events: CalEvent[];
}) {
  const [nav, setNav] = useState(current);
  const mStart = startOfMonth(nav);
  const mEnd   = endOfMonth(nav);
  const days   = eachDayOfInterval({ start: mStart, end: mEnd });
  const offset = (getDay(mStart) + 6) % 7;

  useEffect(() => setNav(current), [current.getMonth(), current.getFullYear()]);

  const dotDays = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => s.add(format(e.date, "yyyy-MM-dd")));
    return s;
  }, [events]);

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setNav(subMonths(nav, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 16, padding: "0 4px" }}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", textTransform: "capitalize" }}>
          {format(nav, "LLLL yyyy", { locale: ru })}
        </span>
        <button onClick={() => setNav(addMonths(nav, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 16, padding: "0 4px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--tx-3)", fontWeight: 600, padding: "2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const today = isToday(day);
          const sel = isSameDay(day, current);
          const hasDot = dotDays.has(key);
          return (
            <button key={key} onClick={() => onSelect(day)}
              style={{
                position: "relative", width: "100%", aspectRatio: "1",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 500,
                background: today ? "var(--accent)" : sel ? "var(--hover)" : "transparent",
                color: today ? "var(--on-accent)" : isSameMonth(day, nav) ? "var(--tx-1)" : "var(--tx-3)",
              }}>
              {format(day, "d")}
              {hasDot && !today && (
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--accent)", position: "absolute", bottom: 2 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Event chip (week/day view) ────────────────────────────────────────────────
function EventChip({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const color = event.type === "post" ? (PLATFORM_COLOR[event.platform ?? ""] ?? TYPE_COLOR.post) : TYPE_COLOR[event.type];
  const bg = event.type === "post" ? (event.platform === "instagram" ? "#4a0d2e" : event.platform === "tiktok" ? "#0d3d2a" : event.platform === "vk" ? "#1a0d4a" : "#0d2a5e") : TYPE_BG[event.type];
  return (
    <div onClick={onClick} style={{
      position: "absolute", left: 2, right: 2,
      top: eventTop(event.date), height: eventHeight(event.date, event.endDate),
      background: bg, borderLeft: `3px solid ${color}`,
      borderRadius: 6, padding: "3px 6px", cursor: "pointer", overflow: "hidden",
      transition: "opacity 0.1s", zIndex: 2,
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {format(event.date, "HH:mm")} {event.title}
      </div>
      {eventHeight(event.date, event.endDate) > 36 && (
        <div style={{ fontSize: 9, color: "var(--tx-3)", marginTop: 2 }}>
          {TYPE_ICON[event.type]} {TYPE_LABEL[event.type]}{event.platform ? ` · ${event.platform}` : ""}
        </div>
      )}
    </div>
  );
}

// ── Month event pill ──────────────────────────────────────────────────────────
function MonthPill({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const color = event.type === "post" ? (PLATFORM_COLOR[event.platform ?? ""] ?? TYPE_COLOR.post) : TYPE_COLOR[event.type];
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "2px 6px", borderRadius: 4, marginBottom: 2,
        background: `${color}22`, cursor: "pointer",
        borderLeft: `2px solid ${color}`,
      }}>
      <span style={{ fontSize: 9, fontWeight: 600, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {format(event.date, "HH:mm")} {event.title}
      </span>
    </div>
  );
}

// ── Quick Create Modal ────────────────────────────────────────────────────────
function QuickCreateModal({ date, onClose, onCreated }: {
  date: Date; onClose: () => void; onCreated: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [type, setType] = useState<EventType>("post");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(format(date, "HH:mm"));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const [h, m] = time.split(":").map(Number);
      const dt = new Date(date);
      dt.setHours(h, m, 0, 0);

      if (type === "task") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, due_date: dt.toISOString(), status: "todo" }),
        });
        if (!res.ok) throw new Error("Ошибка создания задачи");
      } else if (type === "post") {
        router.push(`/${locale}/create`);
        onClose(); return;
      } else if (type === "campaign") {
        router.push(`/${locale}/campaigns`);
        onClose(); return;
      }
      onCreated(); onClose();
    } catch (e: any) { setErr(e.message); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 380, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--tx-1)" }}>Создать событие</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--tx-3)", marginTop: 2 }}>
              {format(date, "d MMMM yyyy", { locale: ru })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)" }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Type selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(["post","task","campaign"] as EventType[]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${type===t ? TYPE_COLOR[t] : "var(--line)"}`,
                background: type===t ? `${TYPE_COLOR[t]}18` : "var(--panel-2)",
                color: type===t ? TYPE_COLOR[t] : "var(--tx-2)",
                cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>{TYPE_ICON[t]}</span>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {type === "task" ? (
            <>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--tx-3)" }}>НАЗВАНИЕ ЗАДАЧИ</p>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Что нужно сделать?"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-1)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--tx-3)" }}>ВРЕМЯ</p>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-1)", fontSize: 13, outline: "none" }} />
              </div>
            </>
          ) : (
            <div style={{ padding: 16, borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line)", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--tx-1)", fontWeight: 600 }}>
                {type === "post" ? "Перейти в создание постов" : "Перейти в кампании"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--tx-3)" }}>
                {type === "post" ? "Создай пост и запланируй его" : "Создай рекламную кампанию"}
              </p>
            </div>
          )}

          {err && <p style={{ margin: 0, fontSize: 12, color: "var(--neg)" }}>{err}</p>}

          <button onClick={handleSave} disabled={saving}
            style={{ padding: "11px", borderRadius: 10, background: TYPE_COLOR[type], color: "#fff", border: "none", cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Сохраняем..." : type === "task" ? "Создать задачу" : type === "post" ? "К созданию поста →" : "К кампаниям →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event detail panel ────────────────────────────────────────────────────────
function EventDetail({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const locale = useLocale();
  const router = useRouter();
  const color = event.type === "post" ? (PLATFORM_COLOR[event.platform ?? ""] ?? TYPE_COLOR.post) : TYPE_COLOR[event.type];

  return (
    <div style={{ width: 280, flexShrink: 0, background: "var(--panel)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {TYPE_LABEL[event.type]}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)" }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--tx-1)", lineHeight: 1.3 }}>{event.title}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: 9, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Дата</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--tx-1)" }}>{format(event.date, "d MMM yyyy", { locale: ru })}</p>
          </div>
          <div style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: 9, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Время</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--tx-1)" }}>{format(event.date, "HH:mm")}</p>
          </div>
        </div>

        {event.platform && (
          <div style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: 9, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Платформа</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_COLOR[event.platform] ?? "var(--tx-3)", display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", textTransform: "capitalize" }}>{event.platform}</span>
            </div>
          </div>
        )}

        {event.status && (
          <div style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: 9, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Статус</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: statusColor(event.status) }}>{statusLabel(event.status)}</span>
          </div>
        )}

        {event.meta?.contents?.caption && (
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 9, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase" }}>Текст поста</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--tx-2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {event.meta.contents.caption}
            </p>
          </div>
        )}

        {event.type === "post" && (
          <button onClick={() => router.push(`/${locale}/history?id=${event.meta?.content_id ?? event.meta?.contents?.id}`)}
            style={{ padding: "10px", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            Открыть пост →
          </button>
        )}
        {event.type === "task" && (
          <button onClick={() => router.push(`/${locale}/tasks`)}
            style={{ padding: "10px", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            Открыть задачи →
          </button>
        )}
        {event.type === "campaign" && (
          <button onClick={() => router.push(`/${locale}/campaigns`)}
            style={{ padding: "10px", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            Открыть кампанию →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const locale = useLocale();
  const qc = useQueryClient();

  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [createSlot, setCreateSlot] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [filters, setFilters] = useState<Record<EventType, boolean>>({ post: true, task: true, campaign: true });

  // Live clock for time indicator
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Date range for queries
  const weekStart = startOfWeek(current, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(current, { weekStartsOn: 1 });
  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);

  const rangeStart = view === "day"   ? format(current, "yyyy-MM-dd")
                   : view === "week"  ? format(weekStart, "yyyy-MM-dd")
                   : view === "agenda"? format(current, "yyyy-MM-dd")
                   : format(monthStart, "yyyy-MM-dd");
  const rangeEnd   = view === "day"   ? format(current, "yyyy-MM-dd")
                   : view === "week"  ? format(weekEnd, "yyyy-MM-dd")
                   : view === "agenda"? format(addDays(current, 30), "yyyy-MM-dd")
                   : format(monthEnd, "yyyy-MM-dd");

  // Fetch posts
  const { data: posts = [] } = useQuery({
    queryKey: ["cal_posts", rangeStart, rangeEnd],
    queryFn: async () => {
      const res = await fetch(`/api/scheduled-posts?start=${rangeStart}&end=${rangeEnd}`);
      return res.ok ? res.json() : [];
    },
    staleTime: 60000,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["cal_tasks", rangeStart, rangeEnd],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?start=${rangeStart}&end=${rangeEnd}`);
      return res.ok ? res.json() : [];
    },
    staleTime: 60000,
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["cal_campaigns", rangeStart, rangeEnd],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns?start=${rangeStart}&end=${rangeEnd}`);
      return res.ok ? res.json() : [];
    },
    staleTime: 60000,
  });

  // Unify into CalEvent[]
  const allEvents = useMemo<CalEvent[]>(() => {
    const evs: CalEvent[] = [];
    if (filters.post) posts.forEach((p: any) => evs.push({
      id: p.id, type: "post",
      title: p.contents?.title || "Пост",
      date: new Date(p.scheduled_at),
      color: PLATFORM_COLOR[p.contents?.platform] ?? TYPE_COLOR.post,
      platform: p.contents?.platform,
      status: p.status, meta: p,
    }));
    if (filters.task) tasks.forEach((t: any) => t.due_date && evs.push({
      id: t.id, type: "task",
      title: t.title,
      date: new Date(t.due_date),
      color: TYPE_COLOR.task,
      status: t.status, meta: t,
    }));
    if (filters.campaign) campaigns.forEach((c: any) => evs.push({
      id: c.id, type: "campaign",
      title: c.name,
      date: new Date(c.created_at),
      color: TYPE_COLOR.campaign,
      status: c.status, meta: c,
    }));
    return evs.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [posts, tasks, campaigns, filters]);

  function getEventsForDay(day: Date) {
    return allEvents.filter(e => isSameDay(e.date, day));
  }

  function navigate(dir: 1 | -1) {
    if (view === "day")    setCurrent(d => dir === 1 ? addDays(d,1) : subDays(d,1));
    else if (view === "week")   setCurrent(d => dir === 1 ? addWeeks(d,1) : subWeeks(d,1));
    else                        setCurrent(d => dir === 1 ? addMonths(d,1) : subMonths(d,1));
  }

  function headerLabel() {
    if (view === "day")    return format(current, "d MMMM yyyy", { locale: ru });
    if (view === "week")   return `${format(weekStart, "d MMM", { locale: ru })} — ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;
    if (view === "agenda") return `Ближайшие 30 дней`;
    return format(current, "LLLL yyyy", { locale: ru });
  }

  const weekDays   = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthDays  = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstOffset = (getDay(monthStart) + 6) % 7;

  // Current time indicator position
  const nowTop = ((now.getHours() + now.getMinutes() / 60 - START_H) * HOUR_H);
  const showNow = now.getHours() >= START_H && now.getHours() < START_H + HOURS.length;

  const totalToday = getEventsForDay(new Date()).length;
  const totalPosts = allEvents.filter(e => e.type === "post").length;
  const totalTasks = allEvents.filter(e => e.type === "task" && e.status !== "done").length;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--line)", background: "var(--panel)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Create button */}
        <div style={{ padding: "14px 14px 10px" }}>
          <button onClick={() => setCreateSlot(current)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            <Plus size={14} /> Создать
          </button>
        </div>

        {/* Mini calendar */}
        <MiniCalendar current={current} onSelect={d => { setCurrent(d); if (view === "month") setView("week"); }} events={allEvents} />

        <div style={{ flex: 1 }} />

        {/* Filters */}
        <div style={{ padding: "14px 14px 20px", borderTop: "1px solid var(--line)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Показывать</p>
          {(Object.keys(filters) as EventType[]).map(type => (
            <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer" }}>
              <div onClick={() => setFilters(f => ({ ...f, [type]: !f[type] }))}
                style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${filters[type] ? TYPE_COLOR[type] : "var(--line)"}`, background: filters[type] ? TYPE_COLOR[type] : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                {filters[type] && <Check size={9} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[type], flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--tx-2)", fontWeight: 500 }}>{TYPE_LABEL[type]}ы</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: 52, borderBottom: "1px solid var(--line)", background: "var(--panel)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setCurrent(new Date())}
              style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "var(--tx-2)", border: "1px solid var(--line)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>
              Сегодня
            </button>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--tx-3)", borderRadius: 6 }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => navigate(1)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--tx-3)", borderRadius: 6 }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", textTransform: "capitalize" }}>{headerLabel()}</span>
          </div>

          {/* View switcher */}
          <div style={{ display: "flex", background: "var(--chip)", borderRadius: 9, padding: 3, gap: 2 }}>
            {([["day","День"],["week","Нед."],["month","Мес."],["agenda","Список"]] as [ViewType,string][]).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", background: view === v ? "var(--panel)" : "transparent", color: view === v ? "var(--tx-1)" : "var(--tx-3)", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ height: 44, borderBottom: "1px solid var(--line)", background: "var(--panel)", padding: "0 20px", display: "flex", alignItems: "center", gap: 28, flexShrink: 0 }}>
          {[
            { label: "Сегодня", value: totalToday, color: "var(--accent)" },
            { label: "Постов", value: totalPosts, color: TYPE_COLOR.post },
            { label: "Задач", value: totalTasks, color: TYPE_COLOR.task },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

          {/* ── WEEK VIEW ── */}
          {(view === "week" || view === "day") && (() => {
            const days = view === "week" ? weekDays : [current];
            const cols = days.length;
            return (
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Time gutter */}
                <div style={{ width: 52, flexShrink: 0, borderRight: "1px solid var(--line)" }}>
                  <div style={{ height: 48, borderBottom: "1px solid var(--line)" }} />
                  <div style={{ overflowY: "hidden", height: `calc(100vh - 196px)` }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ height: HOUR_H, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{String(h).padStart(2,"0")}:00</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Days grid */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                  {/* Day headers */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, borderBottom: "1px solid var(--line)", background: "var(--panel)", position: "sticky", top: 0, zIndex: 10, height: 48 }}>
                    {days.map((day, i) => {
                      const dayEvents = getEventsForDay(day);
                      const today = isToday(day);
                      return (
                        <div key={day.toISOString()}
                          onClick={() => setCreateSlot(day)}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: i < cols-1 ? "1px solid var(--line)" : "none", cursor: "pointer", gap: 2 }}>
                          <span style={{ fontSize: 10, color: "var(--tx-3)", fontWeight: 600, textTransform: "uppercase" }}>{DAYS_SHORT[i]}</span>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: today ? "var(--accent)" : "transparent" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: today ? "var(--on-accent)" : "var(--tx-1)" }}>{format(day,"d")}</span>
                          </div>
                          {dayEvents.length > 0 && <span style={{ fontSize: 9, color: "var(--tx-3)" }}>{dayEvents.length}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hour grid */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, position: "relative" }}>
                    {days.map((day, di) => {
                      const dayEvs = getEventsForDay(day);
                      const isNowDay = isToday(day);
                      return (
                        <div key={day.toISOString()} style={{ position: "relative", borderRight: di < cols-1 ? "1px solid var(--line)" : "none" }}>
                          {/* Hour cells */}
                          {HOURS.map(h => (
                            <div key={h} onClick={() => {
                              const d = new Date(day); d.setHours(h, 0, 0, 0);
                              setCreateSlot(d);
                            }}
                              style={{ height: HOUR_H, borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--hover)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            />
                          ))}
                          {/* Events */}
                          {dayEvs.map(ev => (
                            <EventChip key={ev.id} event={ev} onClick={() => { setSelectedEvent(ev); }} />
                          ))}
                          {/* Now line */}
                          {isNowDay && showNow && (
                            <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, height: 2, background: "var(--neg)", zIndex: 5, pointerEvents: "none" }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--neg)", position: "absolute", left: -4, top: -3 }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── MONTH VIEW ── */}
          {view === "month" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)", background: "var(--panel)", position: "sticky", top: 0, zIndex: 10 }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase" }}>{d}</span>
                  </div>
                ))}
              </div>
              {/* Days */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {Array.from({ length: firstOffset }).map((_, i) => (
                  <div key={`e${i}`} style={{ minHeight: 110, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }} />
                ))}
                {monthDays.map((day) => {
                  const dayEvs = getEventsForDay(day);
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, current);
                  return (
                    <div key={day.toISOString()}
                      onClick={() => { setCurrent(day); setCreateSlot(day); }}
                      style={{ minHeight: 110, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "6px 6px 4px", cursor: "pointer", opacity: inMonth ? 1 : 0.35, background: "var(--panel)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--hover)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--panel)"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: today ? "var(--accent)" : "transparent" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: today ? "var(--on-accent)" : "var(--tx-1)" }}>{format(day,"d")}</span>
                        </div>
                        {dayEvs.length > 2 && (
                          <span style={{ fontSize: 9, color: "var(--tx-3)" }}>+{dayEvs.length - 2}</span>
                        )}
                      </div>
                      {dayEvs.slice(0,2).map(ev => (
                        <MonthPill key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AGENDA VIEW ── */}
          {view === "agenda" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {allEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <p style={{ fontSize: 15, color: "var(--tx-3)", fontWeight: 600 }}>Нет событий в ближайшие 30 дней</p>
                  <button onClick={() => setCreateSlot(current)}
                    style={{ marginTop: 16, padding: "9px 20px", borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    Создать событие
                  </button>
                </div>
              ) : (() => {
                // Group by date
                const groups: Record<string, CalEvent[]> = {};
                allEvents.forEach(ev => {
                  const key = format(ev.date, "yyyy-MM-dd");
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(ev);
                });
                return Object.entries(groups).map(([dateKey, evs]) => {
                  const d = new Date(dateKey + "T12:00:00");
                  return (
                    <div key={dateKey} style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isToday(d) ? "var(--accent)" : "var(--chip)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: isToday(d) ? "var(--on-accent)" : "var(--tx-3)", textTransform: "uppercase" }}>{format(d,"MMM",{locale:ru})}</span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: isToday(d) ? "var(--on-accent)" : "var(--tx-1)", lineHeight: 1 }}>{format(d,"d")}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)", textTransform: "capitalize" }}>
                          {format(d, "EEEE", { locale: ru })}
                          {isToday(d) && <span style={{ marginLeft: 8, fontSize: 10, background: "var(--accent)", color: "var(--on-accent)", padding: "2px 7px", borderRadius: 10 }}>Сегодня</span>}
                        </span>
                      </div>
                      <div style={{ marginLeft: 46, display: "flex", flexDirection: "column", gap: 6 }}>
                        {evs.map(ev => {
                          const color = ev.type === "post" ? (PLATFORM_COLOR[ev.platform??""]) ?? TYPE_COLOR.post : TYPE_COLOR[ev.type];
                          return (
                            <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: 10, cursor: "pointer", transition: "background 0.1s" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--hover)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--panel)"}
                            >
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", minWidth: 36 }}>{format(ev.date,"HH:mm")}</span>
                              <span style={{ fontSize: 14 }}>{TYPE_ICON[ev.type]}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", flex: 1 }}>{ev.title}</span>
                              {ev.platform && <span style={{ fontSize: 10, color: "var(--tx-3)", textTransform: "capitalize" }}>{ev.platform}</span>}
                              {ev.status && <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(ev.status) }}>{statusLabel(ev.status)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ── Event detail panel ── */}
          {selectedEvent && (
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          )}
        </div>
      </div>

      {/* ── Quick create modal ── */}
      {createSlot && (
        <QuickCreateModal date={createSlot} onClose={() => setCreateSlot(null)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["cal_posts"] }); qc.invalidateQueries({ queryKey: ["cal_tasks"] }); }} />
      )}
    </div>
  );
}
