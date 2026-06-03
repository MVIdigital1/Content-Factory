import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import AiInsightWidget from "@/components/features/AiInsightWidget";
import KpiWidget from "@/components/features/KpiWidget";
import { Plus, Calendar, Plug, ArrowRight, FileText } from "lucide-react";

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

const PLATFORM_DOT: Record<string, string> = {
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

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Joha";

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 864e5).toISOString();

  const [
    { count: projectsCount },
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
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
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
    supabase
      .from("contents")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo),
    supabase.from("contents").select("platform"),
    supabase
      .from("scheduled_posts")
      .select("id, scheduled_at, contents(title, platform, type)")
      .eq("status", "pending")
      .gte("scheduled_at", now.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("contents")
      .select("id, title, platform, status, created_at, project:projects(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // 30-дневная активность
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      dateKey: d.toISOString().split("T")[0],
      count: 0,
    };
  });
  activityData?.forEach((c: any) => {
    const day = days30.find((d) => d.dateKey === c.created_at.split("T")[0]);
    if (day) day.count++;
  });

  const platformCounts: Record<string, number> = {};
  platformData?.forEach((c: any) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });

  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);

  const STATS = [
    {
      label: "Проекты",
      value: projectsCount ?? 0,
      delta: null as number | null,
      href: "/projects",
    },
    {
      label: "Генерации",
      value: generationsCount ?? 0,
      delta: genDelta,
      href: "/history",
    },
    {
      label: "Запланировано",
      value: scheduledCount ?? 0,
      delta: null as number | null,
      href: "/calendar",
    },
    {
      label: "Опубликовано",
      value: publishedCount ?? 0,
      delta: pubDelta,
      href: "/history",
    },
    {
      label: "Успешность",
      value:
        (publishedCount ?? 0) > 0
          ? Math.round(
              ((publishedCount ?? 0) / (generationsCount || 1)) * 100,
            ) + "%"
          : "0%",
      delta: null as number | null,
      href: "/analytics",
    },
  ];

  // график (inline SVG, theme-aware)
  const N = days30.length;
  const maxC = Math.max(1, ...days30.map((d) => d.count));
  const x0 = 36,
    x1 = 600,
    top = 16,
    bot = 150;
  const xs = days30.map((_, i) => x0 + (i * (x1 - x0)) / (N - 1));
  const ys = days30.map((d) => bot - (d.count / maxC) * (bot - top));
  let lineD = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < N; i++)
    lineD += ` L ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  const areaD = `${lineD} L ${xs[N - 1].toFixed(1)},${bot} L ${xs[0].toFixed(1)},${bot} Z`;
  const labelIdx = [0, 7, 14, 21, 29];

  const formatScheduledAt = (dateStr: string) => {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (d.toDateString() === new Date().toDateString())
      return `Сегодня ${time}`;
    if (d.toDateString() === new Date(Date.now() + 864e5).toDateString())
      return `Завтра ${time}`;
    return (
      d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) +
      ` ${time}`
    );
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const sparkPattern = [20, 35, 25, 50, 40, 65, 55, 80, 70, 100];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="h-12 border-b border-line px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <div className="flex items-center gap-1.5 text-[12px] text-tx-3">
          <span>Overview</span>
          <span>/</span>
          <span className="text-tx-2 font-medium">Главная</span>
        </div>
        <Link
          href={`/${locale}/create`}
          className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-lg px-3 py-1.5 text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={13} strokeWidth={2.4} />
          Создать контент
        </Link>
      </div>

      <div className="p-6 space-y-4 flex-1">
        {/* Шапка */}
        <div className="flex items-end justify-between">
          <div>
            <div className="ui-label">Обзор</div>
            <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
              Главная
            </h1>
            <p className="text-[13px] text-tx-2 mt-1">
              Добро пожаловать, {firstName}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link
              href={`/${locale}/calendar`}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-line rounded-[10px] text-[12.5px] text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors"
            >
              <Calendar size={14} strokeWidth={1.6} /> Календарь
            </Link>
            <Link
              href={`/${locale}/integrations`}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-line rounded-[10px] text-[12.5px] text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors"
            >
              <Plug size={14} strokeWidth={1.6} /> Каналы
            </Link>
          </div>
        </div>

        {/* AI совет */}
        <AiInsightWidget />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {STATS.map((s) => (
            <Link
              key={s.label}
              href={`/${locale}${s.href}`}
              className="ui-surface p-4 hover:border-line-strong transition-colors block"
            >
              <p className="ui-label mb-3">{s.label}</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="ui-num text-[24px] font-semibold text-tx-1 leading-none">
                    {s.value}
                  </div>
                  <div
                    className={`text-[11px] mt-1.5 ${s.delta != null && s.delta > 0 ? "text-pos" : s.delta != null && s.delta < 0 ? "text-neg" : "text-tx-3"}`}
                  >
                    {s.delta != null && s.delta !== 0
                      ? `${s.delta > 0 ? "↑" : "↓"} ${Math.abs(s.delta)} к прошлой неделе`
                      : "к прошлой неделе"}
                  </div>
                </div>
                <div className="flex items-end gap-0.5 h-7">
                  {sparkPattern.map((h, j) => (
                    <div
                      key={j}
                      className="w-1 rounded-sm"
                      style={{
                        height: `${h * 0.27}px`,
                        background: j >= 6 ? "var(--accent)" : "var(--track)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* График + ближайшие публикации */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 ui-surface p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[14.5px] font-semibold text-tx-1">
                Активность генераций
              </h2>
              <span className="ui-label">30 дней</span>
            </div>
            <svg
              viewBox="0 0 620 170"
              style={{ width: "100%", height: "auto", marginTop: 6 }}
            >
              <line
                x1="36"
                y1="150"
                x2="600"
                y2="150"
                style={{ stroke: "var(--line-strong)" }}
              />
              <line
                x1="36"
                y1="105"
                x2="600"
                y2="105"
                style={{ stroke: "var(--line)" }}
              />
              <line
                x1="36"
                y1="60"
                x2="600"
                y2="60"
                style={{ stroke: "var(--line)" }}
              />
              <path d={areaD} style={{ fill: "var(--accent-dim)" }} />
              <path
                d={lineD}
                fill="none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "var(--accent)" }}
              />
              <circle
                cx={xs[N - 1]}
                cy={ys[N - 1]}
                r="3.5"
                style={{ fill: "var(--accent)" }}
              />
              {labelIdx.map((i) => (
                <text
                  key={i}
                  x={xs[i]}
                  y="166"
                  textAnchor="middle"
                  style={{ fill: "var(--tx-3)", fontSize: 10 }}
                >
                  {days30[i].date}
                </text>
              ))}
            </svg>
            {/* платформы */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
              {Object.keys(platformCounts).length === 0 ? (
                <span className="text-[11.5px] text-tx-3">
                  Нет данных по платформам
                </span>
              ) : (
                Object.entries(platformCounts).map(([p, c]) => (
                  <span
                    key={p}
                    className="flex items-center gap-1.5 text-[12px] text-tx-2 capitalize"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: PLATFORM_DOT[p] || "var(--tx-3)" }}
                    />
                    {p}{" "}
                    <span className="ui-num text-tx-1 font-medium">{c}</span>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Ближайшие публикации */}
          <div className="ui-surface overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
              <p className="text-[13px] font-semibold text-tx-1">
                Ближайшие публикации
              </p>
              <Link
                href={`/${locale}/calendar`}
                className="text-[11px] text-accent hover:opacity-80 font-medium"
              >
                Все →
              </Link>
            </div>
            {!upcomingPosts || upcomingPosts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-4">
                <p className="text-[12.5px] text-tx-3 mb-2">
                  Нет запланированных постов
                </p>
                <Link
                  href={`/${locale}/create`}
                  className="text-[12.5px] text-accent font-medium hover:opacity-80"
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
                      className="flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-panel-2 flex items-center justify-center flex-shrink-0">
                        <FileText
                          size={13}
                          className="text-tx-3"
                          strokeWidth={1.6}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-tx-1 truncate">
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
                            PLATFORM_DOT[content?.platform] || "var(--tx-3)",
                        }}
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Цели */}
        <KpiWidget />

        {/* Последние генерации */}
        <div className="ui-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-tx-1">
              Последние генерации
            </h2>
            <Link
              href={`/${locale}/history`}
              className="text-[12px] text-tx-2 hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              Вся история <ArrowRight size={13} />
            </Link>
          </div>
          {!recentContents || recentContents.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-tx-3">
              Пока нет материалов
            </div>
          ) : (
            <div className="divide-y divide-line">
              {(recentContents as unknown as RecentContent[]).map((c) => {
                const st = STATUS_META[c.status] || STATUS_META.draft;
                return (
                  <Link
                    key={c.id}
                    href={`/${locale}/history`}
                    className="grid grid-cols-[1fr_auto] md:grid-cols-[2.4fr_1.4fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-panel-2 flex items-center justify-center flex-shrink-0">
                        <FileText
                          size={13}
                          className="text-tx-3"
                          strokeWidth={1.6}
                        />
                      </div>
                      <span className="text-[13px] text-tx-1 truncate">
                        {c.title || "Без названия"}
                      </span>
                    </div>
                    <span className="hidden md:block text-[12.5px] text-tx-3 truncate">
                      {c.project?.name || "—"}
                    </span>
                    <span className="hidden md:block text-[12.5px] text-tx-2 capitalize">
                      {c.platform}
                    </span>
                    <div className="flex items-center gap-3 justify-end">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      <span className="ui-num text-[11.5px] text-tx-3 hidden md:inline">
                        {fmtDate(c.created_at)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
