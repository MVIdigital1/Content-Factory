"use client";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "next-intl";
import Link from "next/link";

const PLATFORM_COLORS: Record<string, string> = {
  telegram: "#0088CC",
  instagram: "#E1306C",
  tiktok: "#000",
  vk: "#0077FF",
  yandex: "#FFDB4D",
  google: "#34A853",
  meta: "#1877F2",
};
const PLATFORM_ABBR: Record<string, string> = {
  telegram: "TG",
  instagram: "IG",
  tiktok: "TT",
  vk: "VK",
  yandex: "Я",
  google: "G",
  meta: "M",
};
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  published: { bg: "var(--success-bg)", color: "var(--success-text)" },
  pending: { bg: "var(--warning-bg)", color: "var(--warning-text)" },
  failed: { bg: "var(--danger-bg)", color: "var(--danger-text)" },
  processing: { bg: "var(--info-bg)", color: "var(--info-text)" },
};
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarPage() {
  const locale = useLocale();
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<any>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["scheduled_posts", year, month],
    queryFn: async () => {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, contents(title, caption, platform, type)")
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at");
      return data ?? [];
    },
  });

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const postsForDay = (day: number) => {
    return posts.filter((p) => {
      const d = new Date(p.scheduled_at);
      return (
        d.getDate() === day &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    });
  };

  const isToday = (day: number) => {
    return (
      day === now.getDate() &&
      month === now.getMonth() &&
      year === now.getFullYear()
    );
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalPublished = posts.filter((p) => p.status === "published").length;
  const totalScheduled = posts.filter((p) => p.status === "pending").length;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          borderBottom: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href={`/${locale}/ads`}
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "4px 9px",
              border: "0.5px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-card)",
            }}
          >
            ← Реклама
          </Link>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {MONTHS[month]} {year}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                marginTop: 1,
              }}
            >
              {totalPublished} опубликовано · {totalScheduled} запланировано
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <button
            onClick={prevMonth}
            style={{
              padding: "5px 11px",
              border: "0.5px solid var(--border)",
              borderRadius: 7,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            ◀
          </button>
          <button
            onClick={() => {
              setMonth(now.getMonth());
              setYear(now.getFullYear());
            }}
            style={{
              padding: "5px 11px",
              border: "0.5px solid var(--border)",
              borderRadius: 7,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11,
            }}
          >
            Сегодня
          </button>
          <button
            onClick={nextMonth}
            style={{
              padding: "5px 11px",
              border: "0.5px solid var(--border)",
              borderRadius: 7,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            ▶
          </button>
          <Link
            href={`/${locale}/content`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 7,
              border: "none",
              background: "var(--primary)",
              color: "var(--on-primary)",
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Запланировать
          </Link>
        </div>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 3,
          padding: "8px 12px 4px",
          flexShrink: 0,
          background: "var(--bg-secondary)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "3px 0",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 12px 12px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 4,
            minHeight: "100%",
          }}
        >
          {cells.map((day, i) => {
            if (!day)
              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 7,
                    minHeight: 90,
                    opacity: 0.3,
                  }}
                />
              );
            const dayPosts = postsForDay(day);
            const today = isToday(day);
            return (
              <div
                key={day}
                style={{
                  background: "var(--bg-card)",
                  border: `0.5px solid ${today ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 7,
                  padding: 6,
                  minHeight: 90,
                  cursor: dayPosts.length > 0 ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: today ? 700 : 400,
                    color: today ? "var(--primary)" : "var(--text-secondary)",
                    marginBottom: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {day}
                  {today && (
                    <span
                      style={{
                        fontSize: 8,
                        background: "var(--primary)",
                        color: "var(--on-primary)",
                        padding: "1px 5px",
                        borderRadius: 8,
                        fontWeight: 700,
                      }}
                    >
                      Сегодня
                    </span>
                  )}
                </div>
                {dayPosts.slice(0, 3).map((p, pi) => {
                  const platform =
                    p.platform ?? p.contents?.platform ?? "telegram";
                  const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
                  const time = new Date(p.scheduled_at).toLocaleTimeString(
                    "ru",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <div
                      key={pi}
                      onClick={() => setSelected(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        borderRadius: 4,
                        padding: "2px 5px",
                        marginBottom: 3,
                        fontSize: 9,
                        fontWeight: 500,
                        cursor: "pointer",
                        background: st.bg,
                        color: st.color,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 10,
                          borderRadius: 2,
                          background: PLATFORM_COLORS[platform] ?? "#888",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 6,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {PLATFORM_ABBR[platform] ?? "?"}
                      </div>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {p.contents?.title ??
                          p.contents?.caption?.slice(0, 20) ??
                          "Пост"}
                      </span>
                      <span style={{ flexShrink: 0, opacity: 0.8 }}>
                        {time}
                      </span>
                    </div>
                  );
                })}
                {dayPosts.length > 3 && (
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      padding: "1px 4px",
                    }}
                  >
                    +{dayPosts.length - 3} ещё
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "8px 14px",
          borderTop: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        {[
          {
            label: "Опубликован",
            bg: "var(--success-bg)",
            color: "var(--success-text)",
          },
          {
            label: "Запланирован",
            bg: "var(--warning-bg)",
            color: "var(--warning-text)",
          },
          {
            label: "Ошибка",
            bg: "var(--danger-bg)",
            color: "var(--danger-text)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.bg,
                border: `0.5px solid ${s.color}`,
              }}
            />
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Post detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Детали публикации"
        size="md"
      >
        {selected && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                {
                  l: "Платформа",
                  v:
                    PLATFORM_ABBR[
                      selected.platform ?? selected.contents?.platform ?? ""
                    ] ?? "?",
                },
                {
                  l: "Статус",
                  v:
                    (
                      {
                        published: "Опубликован",
                        pending: "Запланирован",
                        failed: "Ошибка",
                        processing: "В процессе",
                      } as Record<string, string>
                    )[selected.status] ?? selected.status,
                },
                {
                  l: "Запланировано",
                  v: new Date(selected.scheduled_at).toLocaleString("ru"),
                },
                {
                  l: "Опубликовано",
                  v: selected.published_at
                    ? new Date(selected.published_at).toLocaleString("ru")
                    : "—",
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 3,
                    }}
                  >
                    {s.l}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.v}</div>
                </div>
              ))}
            </div>
            {selected.contents?.caption && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                  }}
                >
                  Текст
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selected.contents.caption}
                </div>
              </div>
            )}
            {selected.error_message && (
              <div
                style={{
                  background: "var(--danger-bg)",
                  border: "0.5px solid var(--danger)",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 11,
                  color: "var(--danger-text)",
                }}
              >
                ⚠ {selected.error_message}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
