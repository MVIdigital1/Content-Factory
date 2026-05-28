"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

type Props = {
  activityData: { date: string; count: number }[];
  platformCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  statusCounts: Record<string, number>;
};

const COLORS = ["#1D9E75", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];
const STATUS_COLORS: Record<string, string> = {
  draft: "#9CA3AF",
  generated: "#F59E0B",
  scheduled: "#8B5CF6",
  published: "#1D9E75",
  failed: "#EF4444",
};
const PLATFORM_LABELS: Record<string, string> = {
  telegram: "TG",
  instagram: "IG",
  tiktok: "TT",
};
const TYPE_LABELS: Record<string, string> = {
  post: "Пост",
  video: "Видео",
  stories: "Stories",
  ad: "Рек.",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  generated: "Готово",
  scheduled: "План.",
  published: "Опубл.",
  failed: "Ошибка",
};

const tooltipStyle = {
  fontSize: 11,
  border: "0.5px solid #E5E7EB",
  borderRadius: 2,
  boxShadow: "none",
  background: "#fff",
};

// Empty data fallbacks
const EMPTY_ACTIVITY = Array.from({ length: 7 }, (_, i) => ({
  date: `${i + 1}`,
  count: 0,
}));
const EMPTY_PIE = [{ name: "—", value: 1, fill: "#E5E7EB" }];

export default function DashboardMiniCharts({
  activityData,
  platformCounts,
  typeCounts,
  statusCounts,
}: Props) {
  const platformArr = Object.entries(platformCounts).map(([k, v]) => ({
    name: PLATFORM_LABELS[k] || k,
    value: v,
    fill: COLORS[Object.keys(platformCounts).indexOf(k) % COLORS.length],
  }));
  const typeArr = Object.entries(typeCounts).map(([k, v]) => ({
    name: TYPE_LABELS[k] || k,
    value: v,
  }));
  const statusArr = Object.entries(statusCounts).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k,
    value: v,
    fill: STATUS_COLORS[k] || "#9CA3AF",
  }));

  const hasPlatforms = platformArr.length > 0;
  const hasTypes = typeArr.length > 0;
  const hasStatuses = statusArr.length > 0;

  const pieData = (arr: any[], empty: any[]) => (arr.length > 0 ? arr : empty);

  return (
    <Link href="/analytics" className="block cursor-pointer group">
      <div className="bg-white border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Статистика
          </p>
          <span className="text-xs text-[#1D9E75] group-hover:underline">
            Подробнее →
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Activity bar */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              Активность / 7 дн.
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={activityData.length > 0 ? activityData : EMPTY_ACTIVITY}
                barSize={12}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fill: "#D1D5DB" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#F9FAFB" }}
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [`${v}`, ""]}
                />
                <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                  {(activityData.length > 0
                    ? activityData
                    : EMPTY_ACTIVITY
                  ).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count > 0 ? "#1D9E75" : "#E5E7EB"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Platform pie */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              По платформам
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={pieData(platformArr, EMPTY_PIE)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={38}
                  innerRadius={18}
                >
                  {pieData(platformArr, EMPTY_PIE).map(
                    (entry: any, i: number) => (
                      <Cell
                        key={i}
                        fill={entry.fill || COLORS[i % COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                {hasPlatforms && <Tooltip contentStyle={tooltipStyle} />}
                {hasPlatforms && (
                  <Legend
                    iconSize={7}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 9 }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Type horizontal bar */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              Тип контента
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={hasTypes ? typeArr : [{ name: "—", value: 0 }]}
                layout="vertical"
                barSize={10}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                {hasTypes && <Tooltip contentStyle={tooltipStyle} />}
                <Bar dataKey="value" radius={[0, 1, 1, 0]}>
                  {(hasTypes ? typeArr : [{ name: "—", value: 0 }]).map(
                    (_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={hasTypes ? COLORS[i % COLORS.length] : "#E5E7EB"}
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Status pie */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              По статусам
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={pieData(statusArr, EMPTY_PIE)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={38}
                  innerRadius={18}
                >
                  {pieData(statusArr, EMPTY_PIE).map(
                    (entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill || "#E5E7EB"} />
                    ),
                  )}
                </Pie>
                {hasStatuses && <Tooltip contentStyle={tooltipStyle} />}
                {hasStatuses && (
                  <Legend
                    iconSize={7}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 9 }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Link>
  );
}
