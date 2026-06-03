import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Sparkles,
  Send,
  Clock,
  FileText,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Lightbulb,
  Target,
  ChevronRight,
} from "lucide-react";
import KpiWidget from "@/components/features/KpiWidget";

type RecentContent = {
  id: string;
  title: string | null;
  platform: string;
  status: string;
  created_at: string;
  project?: { name: string } | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Черновик", cls: "bg-chip text-tx-3" },
  generated: { label: "Готово", cls: "bg-accent-dim text-accent" },
  approved: { label: "Одобрено", cls: "bg-accent-dim text-accent" },
  scheduled: { label: "Запланировано", cls: "bg-chip text-c-3" },
  published: { label: "Опубликовано", cls: "bg-accent-dim text-accent" },
  failed: { label: "Ошибка", cls: "bg-chip text-neg" },
};

const PLATFORM_COLOR: Record<string, string> = {
  telegram: "var(--accent)",
  instagram: "var(--c-2)",
  tiktok: "var(--c-3)",
  vk: "var(--c-2)",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "друг";

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5).toISOString();
  const thirtyAgo = new Date(now.getTime() - 29 * 864e5).toISOString();

  const [
    { count: generationsCount },
    { count: scheduledCount },
    { count: publishedCount },
    { count: genThisWeek },
    { count: genLastWeek },
    { count: pubThisWeek },
    { count: pubLastWeek },
    { data: activityData },
    { data: platformData },
    { data: upcomingPosts },
    { data: recentContents },
  ] = await Promise.all([
    supabase.from("contents").select("*", { count: "exact", head: true }),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "scheduled"),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", oneWeekAgo),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", oneWeekAgo),
    supabase
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", oneWeekAgo),
    supabase.from("contents").select("created_at").gte("created_at", thirtyAgo),
    supabase.from("contents").select("platform"),
    supabase
      .from("scheduled_posts")
      .select("id, scheduled_at, contents(title, platform, type)")
      .eq("status", "pending")
      .gte("scheduled_at", now.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(4),
    supabase
      .from("contents")
      .select("id, title, platform, status, created_at, project:projects(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Дельты
  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);

  // 30-дневная активность
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      dateKey: d.toISOString().split("T")[0],
      date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      count: 0,
    };
  });
  activityData?.forEach((c: any) => {
    const day = days30.find((d) => d.dateKey === c.created_at.split("T")[0]);
    if (day) day.count++;
  });

  // Каналы
  const platformCounts: Record<string, number> = {};
  platformData?.forEach((c: any) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });
  const totalPlatform =
    Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;

  // SVG chart
  const N = days30.length;
  const maxC = Math.max(1, ...days30.map((d) => d.count));
  const x0 = 8,
    x1 = 592,
    top = 8,
    bot = 72;
  const xs = days30.map((_, i) => x0 + (i * (x1 - x0)) / (N - 1));
  const ys = days30.map((d) => bot - (d.count / maxC) * (bot - top));
  let lineD = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < N; i++)
    lineD += ` L ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  const areaD = `${lineD} L ${xs[N - 1].toFixed(1)},${bot} L ${xs[0].toFixed(1)},${bot} Z`;
  const labelIdx = [0, 9, 19, 29];

  const formatScheduledAt = (dateStr: string) => {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (d.toDateString() === now.toDateString()) return `Сегодня, ${time}`;
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    if (d.toDateString() === tom.toDateString()) return `Завтра, ${time}`;
    return (
      d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) +
      `, ${time}`
    );
  };

  const todayLabel = now.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const DeltaBadge = ({ delta }: { delta: number }) => {
    if (delta === 0)
      return (
        <span className="text-[10px] text-tx-3 flex items-center gap-0.5">
          <Minus size={10} /> без изм.
        </span>
      );
    if (delta > 0)
      return (
        <span className="text-[10px] text-pos flex items-center gap-0.5">
          <TrendingUp size={10} /> +{delta} к прошлой нед.
        </span>
      );
    return (
      <span className="text-[10px] text-neg flex items-center gap-0.5">
        <TrendingDown size={10} /> {delta} к прошлой нед.
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="h-11 border-b border-line px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <p className="text-[11px] text-tx-3">
          Главная / <span className="text-tx-2 font-medium">Обзор</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/calendar`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors"
          >
            <Calendar size={12} strokeWidth={1.6} />
            Запланировать
          </Link>
          <Link
            href={`/${locale}/create`}
            className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={12} strokeWidth={2.4} />
            Создать контент
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Приветствие + быстрые действия */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-tx-1">
              Привет, {firstName}
            </h1>
            <p className="text-[12px] text-tx-2 mt-0.5 capitalize">
              {todayLabel}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link
              href={`/${locale}/ai-workers`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors bg-panel"
            >
              <Bot size={13} strokeWidth={1.6} />
              AI-план на неделю
            </Link>
            <Link
              href={`/${locale}/create`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors bg-panel"
            >
              <Sparkles size={13} strokeWidth={1.6} />
              Быстрый пост
            </Link>
          </div>
        </div>

        {/* AI совет */}
        <div className="flex items-center gap-3 bg-panel border border-line rounded-[9px] px-4 py-2.5">
          <div
            className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(130,80,223,0.12)" }}
          >
            <Lightbulb
              size={13}
              style={{ color: "#8250df" }}
              strokeWidth={1.6}
            />
          </div>
          <p className="text-[12px] text-tx-1 flex-1">
            <span className="font-medium" style={{ color: "#8250df" }}>
              AI совет:
            </span>{" "}
            Посты с лайфхаками получают на 40% больше сохранений — попробуй
            опубликовать сегодня
          </p>
          <Link
            href={`/${locale}/create`}
            className="text-[11px] font-medium flex-shrink-0 hover:opacity-80 transition-opacity"
            style={{ color: "#8250df" }}
          >
            Создать →
          </Link>
        </div>

        {/* ЗДОРОВЬЕ КОНТЕНТА */}
        <div className="ui-surface p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-semibold text-tx-1">
                Здоровье контента
              </h2>
              <p className="text-[11px] text-tx-3 mt-0.5">
                Активность и охват по каналам — 30 дней
              </p>
            </div>
            <Link
              href={`/${locale}/analytics`}
              className="text-[11px] text-c-2 hover:opacity-80 font-medium"
            >
              Подробнее →
            </Link>
          </div>

          {/* 4 метрики */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-line border border-line rounded-[8px] mb-4 overflow-hidden">
            {[
              {
                label: "Опубликовано",
                value: publishedCount ?? 0,
                delta: pubDelta,
              },
              {
                label: "Генераций",
                value: generationsCount ?? 0,
                delta: genDelta,
              },
              {
                label: "Запланировано",
                value: scheduledCount ?? 0,
                delta: null,
              },
              {
                label: "Успешность",
                value:
                  (publishedCount ?? 0) > 0
                    ? Math.round(
                        ((publishedCount ?? 0) / (generationsCount || 1)) * 100,
                      ) + "%"
                    : "0%",
                delta: null,
              },
            ].map((m) => (
              <div key={m.label} className="px-4 py-3 bg-panel">
                <p className="ui-label mb-2">{m.label}</p>
                <p className="ui-num text-[22px] font-semibold text-tx-1 leading-none">
                  {m.value}
                </p>
                <div className="mt-1.5">
                  {m.delta !== null ? (
                    <DeltaBadge delta={m.delta} />
                  ) : (
                    <span className="text-[10px] text-tx-3">за 30 дней</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* График */}
          <div className="mb-4">
            <svg viewBox="0 0 600 84" style={{ width: "100%", height: "auto" }}>
              <line
                x1="8"
                y1="72"
                x2="592"
                y2="72"
                style={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
              />
              <line
                x1="8"
                y1="44"
                x2="592"
                y2="44"
                style={{ stroke: "var(--line)", strokeWidth: 1 }}
              />
              <line
                x1="8"
                y1="16"
                x2="592"
                y2="16"
                style={{ stroke: "var(--line)", strokeWidth: 1 }}
              />
              <path d={areaD} style={{ fill: "var(--accent-dim)" }} />
              <path
                d={lineD}
                fill="none"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "var(--accent)" }}
              />
              <circle
                cx={xs[N - 1]}
                cy={ys[N - 1]}
                r="3"
                style={{ fill: "var(--accent)" }}
              />
              {labelIdx.map((i) => (
                <text
                  key={i}
                  x={xs[i]}
                  y="83"
                  textAnchor="middle"
                  style={{ fill: "var(--tx-3)", fontSize: 9 }}
                >
                  {days30[i].date}
                </text>
              ))}
            </svg>
          </div>

          {/* Каналы */}
          <div className="space-y-2.5">
            {Object.keys(platformCounts).length === 0 ? (
              <p className="text-[12px] text-tx-3">Нет данных по каналам</p>
            ) : (
              Object.entries(platformCounts).map(([platform, count]) => {
                const pct = Math.round((count / totalPlatform) * 100);
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-[11px] text-tx-2 capitalize min-w-[80px] flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background: PLATFORM_COLOR[platform] || "var(--tx-3)",
                        }}
                      />
                      {platform}
                    </span>
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--track)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            PLATFORM_COLOR[platform] || "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-tx-2 min-w-[28px] text-right ui-num">
                      {count}
                    </span>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-[4px] min-w-[52px] text-center"
                      style={{
                        background:
                          count > 0 ? "var(--accent-dim)" : "var(--chip)",
                        color: count > 0 ? "var(--accent)" : "var(--tx-3)",
                      }}
                    >
                      {count > 0 ? "Активен" : "Нет данных"}
                    </span>
                  </div>
                );
              })
            )}
            {/* Неподключённые каналы */}
            {!platformCounts["instagram"] && (
              <div className="flex items-center gap-3 opacity-50">
                <span className="text-[11px] text-tx-3 min-w-[80px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tx-3" />
                  instagram
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full"
                  style={{ background: "var(--track)" }}
                />
                <span className="text-[11px] text-tx-3 min-w-[28px] text-right">
                  —
                </span>
                <Link
                  href={`/${locale}/integrations`}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded-[4px] min-w-[52px] text-center bg-chip text-c-2 hover:opacity-80"
                >
                  Подключить
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Нижний ряд: лента + публикации */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Последние действия */}
          <div className="ui-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <p className="text-[12.5px] font-semibold text-tx-1">
                Последние действия
              </p>
              <Link
                href={`/${locale}/history`}
                className="text-[11px] text-c-2 hover:opacity-80 font-medium"
              >
                История →
              </Link>
            </div>
            {!recentContents || recentContents.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-tx-3">
                Пока нет действий
              </div>
            ) : (
              <div className="divide-y divide-line">
                {(recentContents as unknown as RecentContent[]).map((c) => {
                  const st = STATUS_META[c.status] || STATUS_META.draft;
                  const Icon =
                    c.status === "published"
                      ? Send
                      : c.status === "scheduled"
                        ? Clock
                        : FileText;
                  const iconBg =
                    c.status === "published"
                      ? {
                          background: "rgba(35,134,54,0.1)",
                          color: "var(--accent)",
                        }
                      : c.status === "scheduled"
                        ? {
                            background: "rgba(154,103,0,0.1)",
                            color: "var(--c-3)",
                          }
                        : { background: "var(--chip)", color: "var(--tx-3)" };
                  return (
                    <Link
                      key={c.id}
                      href={`/${locale}/history`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"
                        style={iconBg}
                      >
                        <Icon size={13} strokeWidth={1.6} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-tx-1 truncate">
                          {c.title || "Без названия"}
                        </p>
                        <p className="text-[10.5px] text-tx-3 mt-0.5 capitalize">
                          {c.platform} · {c.project?.name || "—"}
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-[4px] text-[9.5px] font-medium flex-shrink-0 ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ближайшие публикации */}
          <div className="ui-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <p className="text-[12.5px] font-semibold text-tx-1">
                Ближайшие публикации
              </p>
              <Link
                href={`/${locale}/calendar`}
                className="text-[11px] text-c-2 hover:opacity-80 font-medium"
              >
                Календарь →
              </Link>
            </div>
            {!upcomingPosts || upcomingPosts.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center px-4">
                <p className="text-[12px] text-tx-3 mb-2">
                  Нет запланированных постов
                </p>
                <Link
                  href={`/${locale}/create`}
                  className="text-[12px] font-medium text-accent hover:opacity-80"
                >
                  Запланировать →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {upcomingPosts.map((p: any) => {
                  const content = p.contents;
                  return (
                    <Link
                      key={p.id}
                      href={`/${locale}/calendar`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-hover transition-colors"
                    >
                      <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 bg-panel-2">
                        <FileText
                          size={13}
                          className="text-tx-3"
                          strokeWidth={1.6}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-tx-1 truncate">
                          {content?.title || "—"}
                        </p>
                        <p className="text-[10.5px] text-tx-3 mt-0.5">
                          {formatScheduledAt(p.scheduled_at)}
                        </p>
                      </div>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background:
                            PLATFORM_COLOR[content?.platform] || "var(--tx-3)",
                        }}
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KPI */}
        <KpiWidget />
      </div>
    </div>
  );
}
