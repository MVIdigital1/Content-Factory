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

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

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
    baseQuery().gte("created_at", sevenDaysAgo.toISOString()),
    baseQuery()
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    baseQuery()
      .eq("status", "published")
      .gte("created_at", sevenDaysAgo.toISOString()),
    baseQuery()
      .eq("status", "published")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    dataQuery("created_at").gte("created_at", sevenDaysAgo.toISOString()),
    dataQuery("platform"),
    dataQuery("type"),
    dataQuery("status"),
    dataQuery("created_at").gte("created_at", thirtyDaysAgo.toISOString()),
    dataQuery("created_at"),
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

  const genDelta = (genThisWeek ?? 0) - (genLastWeek ?? 0);
  const pubDelta = (pubThisWeek ?? 0) - (pubLastWeek ?? 0);
  const deltaOf = (d: number) =>
    d === 0
      ? null
      : { sign: d > 0 ? "↑" : "↓", value: Math.abs(d), pos: d > 0 };

  const STATS = [
    {
      label: t("totalGenerations"),
      value: totalGenerations ?? 0,
      delta: deltaOf(genDelta),
      neg: false,
    },
    {
      label: t("scheduled"),
      value: totalScheduled ?? 0,
      delta: null,
      neg: false,
    },
    {
      label: t("published"),
      value: totalPublished ?? 0,
      delta: deltaOf(pubDelta),
      neg: false,
    },
    {
      label: t("errors"),
      value: totalFailed ?? 0,
      delta: null,
      neg: (totalFailed ?? 0) > 0,
    },
  ];

  const hourCounts: number[] = Array(24).fill(0);
  const dayCounts: number[] = Array(7).fill(0);
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
    <div className="p-6 md:p-8 max-w-6xl w-full">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="ui-label">Аналитика</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            {t("title")}
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProject && (
            <Link
              href={`/${locale}/analytics`}
              className="text-[12px] text-tx-3 hover:text-tx-1 transition-colors"
            >
              Все проекты ×
            </Link>
          )}
          <div className="flex gap-1 flex-wrap">
            {(projects || []).slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/analytics?project=${p.id}`}
                className={`text-[12px] px-3 py-1.5 rounded-[9px] border transition-colors ${projectFilter === p.id ? "bg-accent-dim border-accent text-accent font-medium" : "border-line text-tx-2 hover:border-line-strong"}`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATS.map((s) => (
          <div key={s.label} className="ui-surface p-4">
            <div className="ui-label mb-3">{s.label}</div>
            <div
              className={`ui-num text-[26px] font-semibold leading-none ${s.neg ? "text-neg" : "text-tx-1"}`}
            >
              {s.value}
            </div>
            {s.delta ? (
              <div
                className={`text-[11px] mt-2 font-medium ${s.delta.pos ? "text-pos" : "text-neg"}`}
              >
                {s.delta.sign} {s.delta.value} к прошлой неделе
              </div>
            ) : (
              <div className="text-[11px] mt-2 text-tx-3">к прошлой неделе</div>
            )}
          </div>
        ))}
      </div>

      {/* Тепловая карта */}
      {(allDates as any[] | null)?.length ? (
        <div className="ui-surface p-4 mb-6">
          <p className="text-[13px] font-semibold text-tx-1 mb-1">
            Лучшее время для постов
          </p>
          <p className="text-[11px] text-tx-3 mb-3">
            Лучший час:{" "}
            <span className="text-accent font-medium">{bestHour}:00</span> ·
            Лучший день:{" "}
            <span className="text-accent font-medium">{bestDay}</span>
          </p>
          <div className="flex gap-1 mb-3">
            {DAYS.map((day, i) => (
              <div key={day} className="flex-1 text-center">
                <p className="text-[9px] text-tx-3 mb-1">{day}</p>
                <div
                  className="h-6 rounded bg-track"
                  style={{
                    background: `rgba(var(--accent-rgb), ${dayCounts[i] / maxDay})`,
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
                    background: `rgba(var(--accent-rgb), ${count / maxHour})`,
                    minHeight: "4px",
                  }}
                  title={`${h}:00 — ${count} постов`}
                />
                {h % 6 === 0 && <p className="text-[8px] text-tx-3">{h}:00</p>}
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
