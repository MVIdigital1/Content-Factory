"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";

type Props = {
  days7: { date: string; count: number }[];
  days30: { date: string; count: number }[];
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
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  vk: "VK",
};

const tooltipStyle = {
  fontSize: 12,
  border: "0.5px solid #E5E7EB",
  borderRadius: 8,
  boxShadow: "none",
  background: "#fff",
};
const EMPTY_7 = Array.from({ length: 7 }, (_, i) => ({
  date: `${i + 1}`,
  count: 0,
}));
const EMPTY_30 = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}`,
  count: 0,
}));
const EMPTY_PIE = [{ name: "—", value: 1, fill: "#E5E7EB" }];

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
      {title}
    </p>
    {children}
  </div>
);

export default function AnalyticsCharts({
  days7,
  days30,
  platformCounts,
  typeCounts,
  statusCounts,
}: Props) {
  const t = useTranslations("analytics");
  const tHistory = useTranslations("history");

  const TYPE_LABELS: Record<string, string> = {
    post: "Пост",
    video: "Видео",
    stories: "Stories",
    ad: "Реклама",
  };

  const STATUS_LABELS: Record<string, string> = {
    draft: tHistory("status.draft"),
    generated: tHistory("status.generated"),
    approved: tHistory("status.approved"),
    scheduled: tHistory("status.scheduled"),
    published: tHistory("status.published"),
    failed: tHistory("status.failed"),
  };

  const platformArr = Object.entries(platformCounts).map(([k, v], i) => ({
    name: PLATFORM_LABELS[k] || k,
    value: v,
    fill: COLORS[i % COLORS.length],
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={t("activity7")}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={days7.length > 0 ? days7 : EMPTY_7} barSize={20}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#F9FAFB" }}
                contentStyle={tooltipStyle}
                formatter={(v: any) => [`${v}`, ""]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(days7.length > 0 ? days7 : EMPTY_7).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? "#1D9E75" : "#E5E7EB"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t("trend30")}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={days30.length > 0 ? days30 : EMPTY_30}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any) => [`${v}`, ""]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={days30.some((d) => d.count > 0) ? "#1D9E75" : "#E5E7EB"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title={t("byPlatform")}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={hasPlatforms ? platformArr : EMPTY_PIE}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={70}
                innerRadius={35}
              >
                {(hasPlatforms ? platformArr : EMPTY_PIE).map(
                  (entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill || "#E5E7EB"} />
                  ),
                )}
              </Pie>
              {hasPlatforms && <Tooltip contentStyle={tooltipStyle} />}
              {hasPlatforms && (
                <Legend
                  iconSize={9}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t("byType")}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={hasTypes ? typeArr : [{ name: "—", value: 0 }]}
              layout="vertical"
              barSize={14}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              {hasTypes && <Tooltip contentStyle={tooltipStyle} />}
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
        </Card>

        <Card title={t("byStatus")}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={hasStatuses ? statusArr : EMPTY_PIE}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={70}
                innerRadius={35}
              >
                {(hasStatuses ? statusArr : EMPTY_PIE).map(
                  (entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill || "#E5E7EB"} />
                  ),
                )}
              </Pie>
              {hasStatuses && <Tooltip contentStyle={tooltipStyle} />}
              {hasStatuses && (
                <Legend
                  iconSize={9}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
