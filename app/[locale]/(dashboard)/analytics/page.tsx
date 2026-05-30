import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import AnalyticsCharts from "@/components/features/AnalyticsCharts";
import Link from "next/link";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const supabase = await createClient();
  const t = await getTranslations("analytics");
  const locale = await getLocale();
  const { project: projectFilter } = await searchParams;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 13);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);

  // Получить проекты для фильтра
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Базовый запрос с опциональным фильтром по проекту
  const baseQuery = () => {
    let q = supabase
      .from("contents")
      .select("*", { count: "exact", head: true });
    if (projectFilter) q = (q as any).eq("project_id", projectFilter);
    return q;
  };

  const dataQuery = (fields: string) => {
    let q = supabase.from("contents").select(fields);
    if (projectFilter) q = (q as any).eq("project_id", projectFilter);
    return q;
  };

  const [
    { count: totalGenerations },
    { count: totalScheduled },
    { count: totalPublished },
    { count: totalFailed },
    // Сравнение периодов
    { count: genThisWeek },
    { count: genLastWeek },
    { count: pubThisWeek },
    { count: pubLastWeek },
    { data: activityData },
    { data: platformData },
    { data: typeData },
    { data: statusData },
    { data: recentData },
    { data: allDates },
  ] = await Promise.all([
    baseQuery(),
    baseQuery().eq("status", "scheduled"),
    baseQuery().eq("status", "published"),
    baseQuery().eq("status", "failed"),
    // Эта неделя
    baseQuery().gte("created_at", sevenDaysAgo.toISOString()),
    // Прошлая неделя
    baseQuery()
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    // Опубликовано эта неделя
    baseQuery()
      .eq("status", "published")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Опубликовано прошлая неделя
    baseQuery()
      .eq("status", "published")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    dataQuery("created_at").gte("created_at", sevenDaysAgo.toISOString()),
    dataQuery("platform"),
    dataQuery("type"),
    dataQuery("status"),
    dataQuery("created_at").gte("created_at", thirtyDaysAgo.toISOString()),
    dataQuery("created_at"), // для тепловой карты часов
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
  (activityData as { created_at: string }[] | null)?.forEach((c) => {
    const day = days7.find((d) => d.dateKey === c.created_at.split("T")[0]);
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
  (recentData as { created_at: string }[] | null)?.forEach((c) => {
    const day = days30.find((d) => d.dateKey === c.created_at.split("T")[0]);
    if (day) day.count++;
  });

  const platformCounts: Record<string, number> = {};
  (platformData as { platform: string }[] | null)?.forEach((c) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });

  const typeCounts: Record<string, number> = {};
  (typeData as { type: string }[] | null)?.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });

  const statusCounts: Record<string, number> = {};
  (statusData as { status: string }[] | null)?.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  // Дельты для сравнения периодов
  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);

  const getDeltaLabel = (delta: number) => {
    if (delta === 0) return null;
    return {
      sign: delta > 0 ? "↑" : "↓",
      value: Math.abs(delta),
      color: delta > 0 ? "text-[#1D9E75]" : "text-red-500",
    };
  };

  const STATS = [
    {
      label: t("totalGenerations"),
      value: totalGenerations ?? 0,
      color: "text-[#1D9E75]",
      bg: "bg-[#E1F5EE]",
      delta: getDeltaLabel(genDelta),
    },
    {
      label: t("scheduled"),
      value: totalScheduled ?? 0,
      color: "text-purple-600",
      bg: "bg-purple-50",
      delta: null,
    },
    {
      label: t("published"),
      value: totalPublished ?? 0,
      color: "text-blue-500",
      bg: "bg-blue-50",
      delta: getDeltaLabel(pubDelta),
    },
    {
      label: t("errors"),
      value: totalFailed ?? 0,
      color: "text-red-500",
      bg: "bg-red-50",
      delta: null,
    },
  ];

  // Тепловая карта по часам
  const hourCounts: number[] = Array(24).fill(0);
  const dayCounts: number[] = Array(7).fill(0); // 0=Вс, 1=Пн...
  (allDates as { created_at: string }[] | null)?.forEach((c) => {
    const d = new Date(c.created_at);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
  });
  const maxHour = Math.max(...hourCounts, 1);
  const maxDay = Math.max(...dayCounts, 1);
  const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
  const bestDay = DAYS[dayCounts.indexOf(Math.max(...dayCounts))];

  const selectedProject = projects?.find((p) => p.id === projectFilter);

  return (
    <div className="p-4 md:p-6 max-w-6xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        {/* Фильтр по проекту */}
        <div className="flex items-center gap-2">
          {selectedProject && (
            <Link
              href={`/${locale}/analytics`}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Все проекты ×
            </Link>
          )}
          <div className="flex gap-1 flex-wrap">
            {(projects || []).slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/analytics?project=${p.id}`}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${projectFilter === p.id ? "bg-[#E1F5EE] border-[#1D9E75] text-[#1D9E75] font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Карточки с дельтами */}
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
            {s.delta && (
              <div className={`text-[10px] mt-1 font-medium ${s.delta.color}`}>
                {s.delta.sign} {s.delta.value} vs прошлая неделя
              </div>
            )}
            {!s.delta && (
              <div className="text-[10px] mt-1 text-gray-300">
                vs прошлая неделя
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Тепловая карта активности */}
      {(allDates as any[] | null)?.length ? (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            🌡 Тепловая карта — лучшее время для постов
          </p>
          <p className="text-[10px] text-gray-400 mb-3">
            Лучший час:{" "}
            <span className="text-[#1D9E75] font-medium">{bestHour}:00</span> ·
            Лучший день:{" "}
            <span className="text-[#1D9E75] font-medium">{bestDay}</span>
          </p>
          <div className="flex gap-1 mb-3">
            {DAYS.map((day, i) => (
              <div key={day} className="flex-1 text-center">
                <p className="text-[9px] text-gray-400 mb-1">{day}</p>
                <div
                  className="h-6 rounded"
                  style={{
                    background: `rgba(29,158,117,${dayCounts[i] / maxDay})`,
                  }}
                  title={`${dayCounts[i]} постов`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 overflow-x-auto pb-1">
            {hourCounts.map((count, h) => (
              <div key={h} className="flex-shrink-0 w-7 text-center">
                <div
                  className="h-8 rounded-sm mb-1"
                  style={{
                    background: `rgba(29,158,117,${count / maxHour})`,
                    minHeight: "4px",
                  }}
                  title={`${h}:00 — ${count} постов`}
                />
                {h % 6 === 0 && (
                  <p className="text-[8px] text-gray-400">{h}:00</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AnalyticsCharts
        days7={days7}
        days30={days30}
        platformCounts={platformCounts}
        typeCounts={typeCounts}
        statusCounts={statusCounts}
      />
    </div>
  );
}
