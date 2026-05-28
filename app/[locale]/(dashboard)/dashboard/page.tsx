import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DashboardCharts from "@/components/features/DashboardCharts";
import DashboardTable from "@/components/features/DashboardTable";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Привет";

  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twoWeeksAgo = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    now.getTime() - 29 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Все 11 запросов в одном Promise.all
  const [
    { count: projectsCount },
    { count: generationsCount },
    { count: scheduledCount },
    { count: publishedCount },
    { count: genThisWeek },
    { count: genLastWeek },
    { count: pubThisWeek },
    { count: pubLastWeek },
    { count: recentCount },
    { data: activityData },
    { data: platformData },
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
    supabase.from("contents").select("*", { count: "exact", head: true }),
    supabase
      .from("contents")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo),
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

  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);

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
      <div className="h-11 border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Overview</span>
          <span>/</span>
          <span className="text-gray-700 font-medium">Dashboard</span>
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
          Создать контент
        </Link>
      </div>

      <div className="p-5 space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Добро пожаловать, {firstName}
            </p>
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

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {STATS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="px-4 py-4 hover:bg-gray-50 transition-colors block"
              >
                <p className="text-xs text-gray-400 font-medium mb-2">
                  {s.label}
                </p>
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
                          {s.delta > 0 ? "↑" : "↓"} {Math.abs(s.delta)} vs last
                          week
                        </>
                      ) : (
                        "vs last week"
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-7">
                    {[20, 35, 25, 50, 40, 65, 55, 80, 70, 100].map((h, j) => (
                      <div
                        key={j}
                        className="w-1 rounded-sm"
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

        <DashboardCharts
          activityData={days30}
          platformCounts={platformCounts}
        />
        <DashboardTable initialCount={recentCount ?? 0} />
      </div>
    </div>
  );
}
