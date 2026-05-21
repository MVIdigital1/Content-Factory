"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";

type Props = {
  activityData: { date: string; count: number }[];
  platformCounts: Record<string, number>;
  typeCounts: Record<string, number>;
};

const PLATFORM_LABELS: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const COLORS = ["#1D9E75", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function DashboardCharts({
  activityData,
  platformCounts,
  typeCounts,
}: Props) {
  const t = useTranslations("dashboard.charts");

  const TYPE_LABELS: Record<string, string> = {
    post:
      t("activity") === "Активность за 7 дней"
        ? "Пост"
        : t("activity") === "7 kunlik faollik"
          ? "Post"
          : "Post",
    video: t("activity") === "Активность за 7 дней" ? "Видео" : "Video",
    stories: "Stories",
    ad:
      t("activity") === "Активность за 7 дней"
        ? "Реклама"
        : t("activity") === "7 kunlik faollik"
          ? "Reklama"
          : "Ad",
  };

  const hasActivity = activityData.some((d) => d.count > 0);
  const hasPlatforms = Object.keys(platformCounts).length > 0;
  const hasTypes = Object.keys(typeCounts).length > 0;

  const platformArr = Object.entries(platformCounts).map(([k, v]) => ({
    name: PLATFORM_LABELS[k] || k,
    value: v,
  }));
  const typeArr = Object.entries(typeCounts).map(([k, v]) => ({
    name: TYPE_LABELS[k] || k,
    value: v,
  }));
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          {t("activity")}
        </p>
        {hasActivity ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={activityData} barSize={20}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#F3F4F6" }}
                contentStyle={{
                  fontSize: 12,
                  border: "0.5px solid #E5E7EB",
                  borderRadius: 8,
                  boxShadow: "none",
                }}
                formatter={(v: number) => [`${v}`, ""]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {activityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? "#1D9E75" : "#E5E7EB"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-sm text-gray-400">
            {t("noData")}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {t("platforms")}
          </p>
          {hasPlatforms ? (
            <div className="space-y-2">
              {platformArr.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0">
                    {p.name}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(p.value / Math.max(...platformArr.map((x) => x.value))) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-4 text-right">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">{t("noData")}</p>
          )}
        </div>

        {hasTypes && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {t("types")}
            </p>
            <div className="space-y-2">
              {typeArr.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14 flex-shrink-0">
                    {item.name}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / total) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-4 text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
