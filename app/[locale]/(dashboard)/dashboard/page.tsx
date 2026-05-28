import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DashboardCharts from "@/components/features/DashboardCharts";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twoWeeksAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: projectsCount },
    { count: generationsCount },
    { count: scheduledCount },
    { count: publishedCount },
    { count: genThisWeek },
    { count: genLastWeek },
    { count: pubThisWeek },
    { count: pubLastWeek },
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
  ]);

  const [{ data: projects }, { data: recentContents }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("contents")
      .select("id, title, type, platform, status, created_at, projects(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Upcoming posts — отдельно с fallback
  let upcomingPosts: any[] = [];
  try {
    const { data } = await supabase
      .from("scheduled_posts")
      .select("id, scheduled_at, status, contents(title, platform)")
      .eq("status", "pending")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(4);
    upcomingPosts = data || [];
  } catch {
    upcomingPosts = [];
  }

  // Activity data for big chart — last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const [{ data: activityData }, { data: platformData }] = await Promise.all([
    supabase
      .from("contents")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("contents").select("platform"),
  ]);

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      dateKey: d.toISOString().split("T")[0],
      count: 0,
    };
  });
  activityData?.forEach((c) => {
    const day = days30.find((d) => d.dateKey === c.created_at.split("T")[0]);
    if (day) day.count++;
  });

  const platformCounts: Record<string, number> = {};
  platformData?.forEach((c) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Привет";
  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);

  const PROJECT_COLORS = [
    "#1D9E75",
    "#F59E0B",
    "#8B5CF6",
    "#3B82F6",
    "#EC4899",
    "#EF4444",
  ];

  const STATS = [
    {
      label: "Проекты",
      value: projectsCount ?? 0,
      delta: null,
      href: "/projects",
      accent: "#1D9E75",
    },
    {
      label: "Генерации",
      value: generationsCount ?? 0,
      delta: genDelta,
      href: "/history",
      accent: "#3B82F6",
    },
    {
      label: "Запланировано",
      value: scheduledCount ?? 0,
      delta: null,
      href: "/calendar",
      accent: "#F59E0B",
    },
    {
      label: "Опубликовано",
      value: publishedCount ?? 0,
      delta: pubDelta,
      href: "/history?status=published",
      accent: "#8B5CF6",
    },
    {
      label: "Успешность",
      value:
        (publishedCount ?? 0) > 0
          ? Math.round(((publishedCount ?? 0) / (generationsCount || 1)) * 100)
          : 0,
      delta: null,
      href: "/analytics",
      accent: "#EC4899",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Topbar */}
      <div className="h-11 border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Overview</span>
          <span>/</span>
          <span className="text-gray-700 font-medium">Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
            Weekly
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8.5" cy="8.5" r="6" />
              <path d="M2.5 2.5l19 19" />
            </svg>
            Share
          </button>
          <Link
            href="/create"
            className="flex items-center gap-1.5 bg-[#1D9E75] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#0F6E56] transition-colors"
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
            Создать контент
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Добро пожаловать, {firstName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h13M3 8h9M3 12h9M13 12h8M13 16h8M3 16h5" />
              </svg>
              Sort by
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <Link
              href="/create"
              className="flex items-center gap-1.5 bg-[#1D9E75] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#0F6E56] transition-colors"
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
              Новый пост
            </Link>
          </div>
        </div>

        {/* Metrics row — как на скрине: label, big number, delta, sparkline */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {STATS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="px-4 py-4 hover:bg-gray-50 transition-colors group block"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                  <button className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    •••
                  </button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold text-gray-900 leading-none">
                      {s.value}
                    </div>
                    <div
                      className={`text-xs mt-1.5 flex items-center gap-1 ${s.delta !== null && s.delta > 0 ? "text-[#1D9E75]" : s.delta !== null && s.delta < 0 ? "text-red-500" : "text-gray-400"}`}
                    >
                      {s.delta !== null && s.delta !== 0 ? (
                        <>
                          {s.delta > 0 ? "↑" : "↓"} +{Math.abs(s.delta)} vs last
                          week
                        </>
                      ) : (
                        "vs last week"
                      )}
                    </div>
                  </div>
                  {/* Sparkline */}
                  <div className="flex items-end gap-0.5 h-7">
                    {[20, 35, 25, 50, 40, 65, 55, 80, 70, 100].map((h, j) => (
                      <div
                        key={j}
                        className="w-1 rounded-sm transition-all"
                        style={{
                          height: `${h * 0.27}px`,
                          background: j >= 6 ? s.accent : "#E5E7EB",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Big chart */}
        <DashboardCharts
          activityData={days30}
          platformCounts={platformCounts}
        />

        {/* Bottom table — как на скрине: строки с данными */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100">
            {["Последние генерации", "Запланировано", "Опубликовано"].map(
              (tab, i) => (
                <button
                  key={tab}
                  className={`text-xs font-medium pb-0.5 transition-colors cursor-pointer ${i === 0 ? "text-gray-900 border-b-2 border-[#1D9E75]" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {tab}
                  {i === 0 && (
                    <span className="ml-1.5 bg-[#E8F5EE] text-[#1D9E75] text-[10px] px-1.5 py-0.5 rounded-full">
                      {recentContents?.length || 0}
                    </span>
                  )}
                </button>
              ),
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-400 cursor-pointer hover:bg-gray-50">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                Поиск
              </div>
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-400 cursor-pointer hover:bg-gray-50">
                Row View
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-2 border-b border-gray-50 bg-gray-50/50">
            <div className="col-span-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Заголовок
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Проект
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Платформа
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Дата
            </div>
          </div>

          {recentContents && recentContents.length > 0 ? (
            recentContents.map((c, i) => (
              <Link
                key={c.id}
                href={`/history?id=${c.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/70 transition-colors group last:border-0"
              >
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                    {c.type === "video"
                      ? "🎬"
                      : c.type === "post"
                        ? "📝"
                        : c.type === "stories"
                          ? "📸"
                          : "📢"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {c.title || "—"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {c.type}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-600 truncate">
                    {(c.projects as any)?.name || "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-500 capitalize">
                    {c.platform || "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      c.status === "published"
                        ? "bg-blue-50 text-blue-600"
                        : c.status === "scheduled"
                          ? "bg-[#F0FDF8] text-[#1D9E75]"
                          : c.status === "generated"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status === "published"
                      ? "Active"
                      : c.status === "scheduled"
                        ? "Scheduled"
                        : c.status === "generated"
                          ? "Ready"
                          : "Draft"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">✦</div>
              <p className="text-sm text-gray-400 mb-3">Нет генераций</p>
              <Link
                href="/create"
                className="text-sm text-[#1D9E75] font-medium hover:underline"
              >
                Создать первый пост →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
