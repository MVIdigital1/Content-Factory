"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  isSameMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, CalendarDays } from "lucide-react";

const PLATFORM_DOT: Record<string, string> = {
  telegram: "#3B82F6",
  instagram: "#EC4899",
  tiktok: "#10B981",
  vk: "#8B5CF6",
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarPage() {
  const supabase = createClient();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateFnsLocale = locale === "ru" ? ru : undefined;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "plan">("schedule");
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Schedule form
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleOk, setScheduleOk] = useState(false);
  const [scheduleErr, setScheduleErr] = useState("");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = (getDay(monthStart) + 6) % 7;

  const qStart =
    view === "week"
      ? format(weekStart, "yyyy-MM-dd")
      : format(monthStart, "yyyy-MM-dd");
  const qEnd =
    view === "week"
      ? format(weekEnd, "yyyy-MM-dd")
      : format(monthEnd, "yyyy-MM-dd");

  const { data: scheduled } = useQuery({
    queryKey: ["cal", qStart, qEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, contents(id, title, platform, type, caption)")
        .gte("scheduled_at", qStart)
        .lte("scheduled_at", qEnd + "T23:59:59")
        .neq("status", "draft")
        .order("scheduled_at");
      return data || [];
    },
  });

  const { data: readyPosts } = useQuery({
    queryKey: ["ready-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, platform, type")
        .in("status", ["generated", "draft"])
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const getByDay = (day: Date) =>
    (scheduled || []).filter((p: any) =>
      isSameDay(new Date(p.scheduled_at), day),
    );
  const getBySlot = (day: Date, hour: number) =>
    (scheduled || []).filter((p: any) => {
      const d = new Date(p.scheduled_at);
      return isSameDay(d, day) && d.getHours() === hour;
    });

  const clickDay = (day: Date) => {
    setSelectedDay(day);
    setSelectedPost(null);
    setScheduleOk(false);
    setScheduleErr("");
    setSelectedContentId("");
  };

  const clickPost = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setSelectedPost(p);
    setActiveTab("schedule");
  };

  const handleSchedule = async () => {
    if (!selectedContentId || !selectedDay) {
      setScheduleErr("Выберите дату и пост");
      return;
    }
    setScheduling(true);
    setScheduleErr("");
    try {
      const scheduledAt = new Date(
        format(selectedDay, "yyyy-MM-dd") + "T" + scheduleTime,
      ).toISOString();
      const post = readyPosts?.find((p: any) => p.id === selectedContentId);
      const { error } = await supabase.from("scheduled_posts").insert({
        content_id: selectedContentId,
        platform: post?.platform || "telegram",
        scheduled_at: scheduledAt,
        status: "pending",
      });
      if (error) throw error;
      await supabase
        .from("contents")
        .update({ status: "scheduled" })
        .eq("id", selectedContentId);
      setScheduleOk(true);
      queryClient.invalidateQueries({ queryKey: ["cal"] });
      setTimeout(() => {
        setScheduleOk(false);
        setSelectedContentId("");
        setActiveTab("schedule");
      }, 2000);
    } catch (e: any) {
      setScheduleErr(e.message);
    }
    setScheduling(false);
  };

  const totalPosts = (scheduled || []).length;
  const pendingPosts = (scheduled || []).filter(
    (p: any) => p.status === "pending",
  ).length;
  const publishedPosts = (scheduled || []).filter(
    (p: any) => p.status === "published",
  ).length;

  const PostBlock = ({ p }: { p: any }) => (
    <div
      onClick={(e) => clickPost(e, p)}
      className="rounded-lg px-2 py-1.5 mb-0.5 cursor-pointer bg-panel-2 border border-line hover:border-line-strong transition-colors"
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: PLATFORM_DOT[p.contents?.platform] || "var(--tx-3)",
          }}
        />
        <span className="text-[10px] font-semibold text-tx-1">
          {format(new Date(p.scheduled_at), "HH:mm")}
        </span>
      </div>
      <div className="text-[10px] font-medium text-tx-2 truncate leading-tight">
        {p.contents?.title || "—"}
      </div>
      <div className="text-[9px] text-tx-3 capitalize">{p.contents?.type}</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-panel overflow-hidden">
      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-panel border-b border-line px-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDay(new Date());
              }}
              className="px-3 py-1.5 text-xs border border-line-strong rounded-lg text-tx-2 hover:bg-hover cursor-pointer font-medium transition-colors"
            >
              Сегодня
            </button>
            <div className="flex items-center">
              <button
                onClick={() =>
                  view === "week"
                    ? setCurrentDate(subWeeks(currentDate, 1))
                    : setCurrentDate(subMonths(currentDate, 1))
                }
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-hover text-tx-3 cursor-pointer text-sm transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() =>
                  view === "week"
                    ? setCurrentDate(addWeeks(currentDate, 1))
                    : setCurrentDate(addMonths(currentDate, 1))
                }
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-hover text-tx-3 cursor-pointer text-sm transition-colors"
              >
                ›
              </button>
            </div>
            <span className="text-sm font-semibold text-tx-1 capitalize">
              {view === "week"
                ? `${format(weekStart, "d MMM", { locale: dateFnsLocale })} — ${format(weekEnd, "d MMM yyyy", { locale: dateFnsLocale })}`
                : format(currentDate, "LLLL yyyy", { locale: dateFnsLocale })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-chip rounded-lg p-0.5 gap-0.5">
              {(["week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs rounded-md cursor-pointer font-medium transition-all ${view === v ? "bg-panel text-tx-1 shadow-sm" : "text-tx-3 hover:text-tx-2"}`}
                >
                  {v === "week" ? "Неделя" : "Месяц"}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setActiveTab("plan");
                if (!selectedDay) setSelectedDay(new Date());
              }}
              className="flex items-center gap-1.5 bg-accent text-on-accent rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-colors cursor-pointer"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Запланировать
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-panel border-b border-line px-5 py-2.5 flex items-center gap-8 flex-shrink-0">
          {[
            {
              label: "Всего постов",
              value: totalPosts,
              delta: "+12%",
              sub: "за неделю",
            },
            {
              label: "Ожидает",
              value: pendingPosts,
              delta: "+5%",
              sub: "за неделю",
            },
            {
              label: "Опубликовано",
              value: publishedPosts,
              delta: "+8%",
              sub: "за неделю",
            },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div>
                <div className="text-[10px] text-tx-3 font-medium">
                  {s.label}
                </div>
                <div className="text-[10px] text-tx-3">{s.sub}</div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-tx-1">
                  {s.value}
                </span>
                <span className="text-xs text-accent font-medium">
                  {s.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Time col */}
            <div className="w-14 flex-shrink-0 bg-panel border-r border-line">
              <div className="h-14 border-b border-line flex items-end justify-end pr-2 pb-1">
                <span className="text-[9px] text-tx-3">GMT+5</span>
              </div>
              <div
                className="overflow-y-auto"
                style={{ height: "calc(100vh - 220px)" }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="h-20 flex items-start pt-1 pr-2 justify-end border-b border-line"
                  >
                    <span className="text-[10px] text-tx-3">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Days grid */}
            <div className="flex-1 overflow-auto">
              {/* Headers */}
              <div className="grid grid-cols-7 border-b border-line bg-panel sticky top-0 z-10">
                {weekDays.map((day, i) => {
                  const posts = getByDay(day);
                  const today = isToday(day);
                  const sel = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => clickDay(day)}
                      className={`h-14 flex flex-col items-center justify-center border-r border-line last:border-0 cursor-pointer transition-colors ${sel ? "bg-accent-dim" : "hover:bg-hover"}`}
                    >
                      <span className="text-[10px] text-tx-3 font-medium uppercase tracking-wide">
                        {DAYS_SHORT[i]}
                      </span>
                      <div
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold mt-0.5 ${today ? "bg-accent text-on-accent" : sel ? "text-accent" : "text-tx-1"}`}
                      >
                        {format(day, "d")}
                      </div>
                      {posts.length > 0 && (
                        <div className="text-[9px] text-tx-3 mt-0.5">
                          {posts.length} пост{posts.length > 1 ? "а" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hour rows */}
              <div>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-7 border-b border-line"
                  >
                    {weekDays.map((day) => {
                      const posts = getBySlot(day, hour);
                      const sel = selectedDay && isSameDay(day, selectedDay);
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => clickDay(day)}
                          className={`h-20 border-r border-line last:border-0 p-1 cursor-pointer transition-colors ${sel ? "bg-accent-dim" : "hover:bg-hover/50"}`}
                        >
                          {posts.map((p: any) => (
                            <PostBlock key={p.id} p={p} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MONTH VIEW — same style as week */}
        {view === "month" && (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto">
              {/* Headers */}
              <div className="grid grid-cols-7 border-b border-line bg-panel sticky top-0 z-10">
                {DAYS_SHORT.map((d) => (
                  <div
                    key={d}
                    className="h-10 flex items-center justify-center border-r border-line last:border-0"
                  >
                    <span className="text-[10px] text-tx-3 font-medium uppercase tracking-wide">
                      {d}
                    </span>
                  </div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 divide-x divide-line">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div
                    key={`e-${i}`}
                    className="min-h-[120px] border-b border-line bg-panel-2/30"
                  />
                ))}
                {monthDays.map((day) => {
                  const posts = getByDay(day);
                  const today = isToday(day);
                  const sel = selectedDay && isSameDay(day, selectedDay);
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => clickDay(day)}
                      className={`min-h-[120px] border-b border-line p-2 cursor-pointer transition-colors ${sel ? "bg-accent-dim" : "hover:bg-hover/70"} ${!inMonth ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1.5 ${today ? "bg-accent text-on-accent" : "text-tx-1"}`}
                      >
                        {format(day, "d")}
                      </div>
                      {posts.map((p: any) => (
                        <PostBlock key={p.id} p={p} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LEFT PANEL — post info / day schedule */}
      {selectedDay && (
        <div className="w-64 flex-shrink-0 bg-panel border-l border-line flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-tx-1 capitalize">
                {format(selectedDay, "d MMMM yyyy", { locale: dateFnsLocale })}
              </p>
              <p className="text-[10px] text-tx-3 mt-0.5">
                {getByDay(selectedDay).length} публикаций
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedDay(null);
                setSelectedPost(null);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-chip text-tx-3 hover:bg-hover cursor-pointer text-sm"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedPost ? (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="flex items-center gap-1 text-xs text-tx-3 hover:text-tx-2 cursor-pointer transition-colors"
                >
                  ← Назад
                </button>
                <div>
                  <div className="text-[10px] text-tx-3 uppercase tracking-wider mb-1">
                    Заголовок
                  </div>
                  <p className="text-sm font-semibold text-tx-1">
                    {selectedPost.contents?.title || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-tx-3 uppercase tracking-wider mb-1">
                      Время
                    </div>
                    <p className="text-xs text-tx-2">
                      {format(new Date(selectedPost.scheduled_at), "HH:mm")}
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] text-tx-3 uppercase tracking-wider mb-1">
                      Платформа
                    </div>
                    <p className="text-xs text-tx-2 capitalize">
                      {selectedPost.contents?.platform}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-tx-3 uppercase tracking-wider mb-1">
                    Статус
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedPost.status === "published" ? "bg-pos-dim text-pos" : selectedPost.status === "failed" ? "bg-chip text-neg" : "bg-chip text-c-3"}`}
                  >
                    {selectedPost.status === "published"
                      ? "Опубликовано"
                      : selectedPost.status === "failed"
                        ? "Ошибка"
                        : "Ожидает"}
                  </span>
                </div>
                {selectedPost.contents?.caption && (
                  <div>
                    <div className="text-[10px] text-tx-3 uppercase tracking-wider mb-1">
                      Текст
                    </div>
                    <p className="text-xs text-tx-2 line-clamp-5 leading-relaxed">
                      {selectedPost.contents.caption}
                    </p>
                  </div>
                )}
                <button
                  onClick={() =>
                    router.push(
                      `/${locale}/history?id=${selectedPost.contents?.id}`,
                    )
                  }
                  className="w-full py-2 bg-accent text-on-accent rounded-lg text-xs font-medium hover:opacity-90 cursor-pointer transition-colors"
                >
                  Открыть в истории →
                </button>
              </div>
            ) : getByDay(selectedDay).length === 0 ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 rounded-2xl bg-accent-dim flex items-center justify-center mb-2 mx-auto">
                  <CalendarDays
                    size={18}
                    className="text-accent"
                    strokeWidth={1.6}
                  />
                </div>
                <p className="text-xs text-tx-3">Нет публикаций на этот день</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getByDay(selectedDay).map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPost(p)}
                    className="rounded-xl border border-line p-3 hover:border-accent hover:bg-accent-dim transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background:
                            PLATFORM_DOT[p.contents?.platform] || "var(--tx-3)",
                        }}
                      />
                      <span className="text-[10px] text-tx-2 capitalize flex-1">
                        {p.contents?.platform}
                      </span>
                      <span className="text-[10px] text-tx-3 font-mono">
                        {format(new Date(p.scheduled_at), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-tx-1 truncate">
                      {p.contents?.title || "—"}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1.5 inline-block ${p.status === "published" ? "bg-pos-dim text-pos" : p.status === "failed" ? "bg-chip text-neg" : "bg-chip text-c-3"}`}
                    >
                      {p.status === "published"
                        ? "Опубликовано"
                        : p.status === "failed"
                          ? "Ошибка"
                          : "Ожидает"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RIGHT PANEL — always visible: schedule form */}
      <div className="w-64 flex-shrink-0 bg-panel border-l border-line flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <p className="text-sm font-semibold text-tx-1">Запланировать</p>
          <p className="text-[10px] text-tx-3 mt-0.5">Выберите дату и пост</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {scheduleOk ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-accent-dim rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-accent" strokeWidth={2.2} />
              </div>
              <p className="text-sm font-semibold text-accent">
                Запланировано!
              </p>
              {selectedDay && (
                <p className="text-xs text-tx-3 mt-1">
                  {format(selectedDay, "d MMMM", { locale: dateFnsLocale })} в{" "}
                  {scheduleTime}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Date picker */}
              <div>
                <p className="text-[10px] font-medium text-tx-3 uppercase tracking-wider mb-1.5">
                  Дата и время
                </p>
                {selectedDay ? (
                  <div className="bg-panel-2 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <span className="text-xs text-tx-1 flex-1 font-medium">
                      {format(selectedDay, "d MMM yyyy", {
                        locale: dateFnsLocale,
                      })}
                    </span>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-transparent outline-none text-xs text-accent font-semibold cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="bg-chip border border-line rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                    <p className="text-xs text-c-3 font-medium">
                      Выберите дату в календаре
                    </p>
                  </div>
                )}
              </div>

              {/* Posts list */}
              <div>
                <p className="text-[10px] font-medium text-tx-3 uppercase tracking-wider mb-1.5">
                  Выберите пост
                </p>
                {readyPosts && readyPosts.length > 0 ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {readyPosts.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedContentId(p.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${selectedContentId === p.id ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong bg-panel"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                PLATFORM_DOT[p.platform] || "var(--tx-3)",
                            }}
                          />
                          <span className="text-[10px] text-tx-3 capitalize">
                            {p.platform} · {p.type}
                          </span>
                          {selectedContentId === p.id && (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="ml-auto"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <p className="text-xs font-medium text-tx-1 truncate">
                          {p.title || "—"}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 border border-line rounded-xl">
                    <p className="text-xs text-tx-3 mb-1.5">
                      Нет готовых постов
                    </p>
                    <a
                      href={`/${locale}/create`}
                      className="text-xs text-accent font-medium hover:underline"
                    >
                      Создать пост →
                    </a>
                  </div>
                )}
              </div>

              {scheduleErr && (
                <div className="bg-chip border border-line rounded-lg px-3 py-2 text-xs text-neg">
                  {scheduleErr}
                </div>
              )}

              <button
                onClick={handleSchedule}
                disabled={scheduling || !selectedContentId || !selectedDay}
                className="w-full py-2.5 bg-accent text-on-accent rounded-xl text-xs font-semibold hover:opacity-90 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {scheduling ? "Сохраняем..." : "Запланировать"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
