import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import AnalyticsCharts from "@/components/features/AnalyticsCharts";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const t = await getTranslations("analytics");
  const locale = await getLocale();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [
    { count: totalGenerations },
    { count: totalScheduled },
    { count: totalPublished },
    { count: totalFailed },
    { data: activityData },
    { data: platformData },
    { data: typeData },
    { data: statusData },
    { data: recentData },
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
      .eq("status", "failed"),
    supabase
      .from("contents")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("contents").select("platform"),
    supabase.from("contents").select("type"),
    supabase.from("contents").select("status"),
    supabase
      .from("contents")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  const dateLocale =
    locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU";

  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString(dateLocale, {
        weekday: "short",
        day: "numeric",
      }),
      dateKey: d.toISOString().split("T")[0],
      count: 0,
    };
  });
  activityData?.forEach((c) => {
    const key = c.created_at.split("T")[0];
    const day = days7.find((d) => d.dateKey === key);
    if (day) day.count++;
  });

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
      }),
      dateKey: d.toISOString().split("T")[0],
      count: 0,
    };
  });
  recentData?.forEach((c) => {
    const key = c.created_at.split("T")[0];
    const day = days30.find((d) => d.dateKey === key);
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

  const STATS = [
    {
      label: t("totalGenerations"),
      value: totalGenerations ?? 0,
      color: "text-[#1D9E75]",
      bg: "bg-[#E1F5EE]",
    },
    {
      label: t("scheduled"),
      value: totalScheduled ?? 0,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: t("published"),
      value: totalPublished ?? 0,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: t("errors"),
      value: totalFailed ?? 0,
      color: "text-red-500",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <div
              className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}
            >
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <AnalyticsCharts
        days7={days7}
        days30={days30}
        platformCounts={platformCounts}
        typeCounts={typeCounts}
        statusCounts={statusCounts}
        labels={{
          activity7: t("activity7"),
          trend30: t("trend30"),
          byPlatform: t("byPlatform"),
          byType: t("byType"),
          byStatus: t("byStatus"),
        }}
      />
    </div>
  );
}
