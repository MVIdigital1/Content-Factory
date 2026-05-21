import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DashboardMiniCharts from "@/components/features/DashboardMiniCharts";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: projectsCount },
    { count: generationsCount },
    { count: scheduledCount },
    { count: publishedCount },
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
  ]);

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(4);
  const { data: recentContents } = await supabase
    .from("contents")
    .select("*, projects(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const { data: activityData } = await supabase
    .from("contents")
    .select("created_at")
    .gte("created_at", sevenDaysAgo.toISOString());
  const { data: platformData } = await supabase
    .from("contents")
    .select("platform");
  const { data: typeData } = await supabase.from("contents").select("type");
  const { data: statusData } = await supabase.from("contents").select("status");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }),
      dateKey: d.toISOString().split("T")[0],
      count: 0,
    };
  });
  activityData?.forEach((c) => {
    const key = c.created_at.split("T")[0];
    const day = days.find((d) => d.dateKey === key);
    if (day) day.count++;
  });

  const platformCounts: Record<string, number> = {};
  platformData?.forEach((c) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });

  const typeCounts: Record<string, number> = {};
  typeData?.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });

  const statusCounts: Record<string, number> = {};
  statusData?.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Привет";

  const STATS = [
    {
      label: t("stats.projects"),
      value: projectsCount ?? 0,
      color: "text-[#1D9E75]",
      bg: "bg-[#E1F5EE]",
      href: "/projects",
    },
    {
      label: t("stats.generations"),
      value: generationsCount ?? 0,
      color: "text-blue-500",
      bg: "bg-blue-50",
      href: "/history",
    },
    {
      label: t("stats.scheduled"),
      value: scheduledCount ?? 0,
      color: "text-amber-500",
      bg: "bg-amber-50",
      href: "/calendar",
    },
    {
      label: t("stats.published"),
      value: publishedCount ?? 0,
      color: "text-purple-500",
      bg: "bg-purple-50",
      href: "/history?status=published",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("welcome", { name: firstName })}
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          ✦ {t("createBtn")}
        </Link>
      </div>

      {/* Stat cards — кликабельные */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div
              className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}
            >
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Mini charts block — кликабельный → /analytics */}
      <DashboardMiniCharts
        activityData={days}
        platformCounts={platformCounts}
        typeCounts={typeCounts}
        statusCounts={statusCounts}
      />

      {/* Bottom blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Projects */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {t("myProjects")}
            </span>
            <Link
              href="/projects"
              className="text-xs text-[#1D9E75] hover:underline cursor-pointer"
            >
              {t("allProjects")}
            </Link>
          </div>
          {projects && projects.length > 0 ? (
            <div className="space-y-1.5">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-sm flex-shrink-0">
                    📁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.niche || "—"}</p>
                  </div>
                  <span className="text-gray-300 text-sm">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">{t("noProjects")}</p>
              <Link
                href="/projects"
                className="text-xs text-[#1D9E75] font-semibold hover:underline cursor-pointer"
              >
                {t("createFirstProject")}
              </Link>
            </div>
          )}
        </div>

        {/* Recent generations */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {t("recentGenerations")}
            </span>
            <Link
              href="/history"
              className="text-xs text-[#1D9E75] hover:underline cursor-pointer"
            >
              {t("allHistory")}
            </Link>
          </div>
          {recentContents && recentContents.length > 0 ? (
            <div className="space-y-1.5">
              {recentContents.map((c) => (
                <Link
                  key={c.id}
                  href={`/history?id=${c.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm flex-shrink-0">
                    {c.type === "video"
                      ? "🎬"
                      : c.type === "post"
                        ? "📝"
                        : c.type === "stories"
                          ? "📸"
                          : "📢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.title || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(c.projects as any)?.name}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      c.status === "published"
                        ? "bg-blue-50 text-blue-600"
                        : c.status === "scheduled"
                          ? "bg-[#E1F5EE] text-[#1D9E75]"
                          : c.status === "generated"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status === "published"
                      ? t("stats.published")
                      : c.status === "scheduled"
                        ? t("stats.scheduled")
                        : c.status === "generated"
                          ? "Готово"
                          : "Черновик"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">{t("noGenerations")}</p>
              <Link
                href="/create"
                className="text-xs text-[#1D9E75] font-semibold hover:underline cursor-pointer"
              >
                {t("createContent")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
