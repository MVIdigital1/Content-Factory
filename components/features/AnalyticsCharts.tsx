"use client";

import { useEffect, useState } from "react";
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

// Категориальные цвета (различимы в обеих темах)
const COLORS = ["#159a6f", "#6c63d9", "#bd8312", "#8B5CF6", "#EC4899"];
const STATUS_COLORS: Record<string, string> = {
  draft: "#9CA3AF",
  generated: "#bd8312",
  approved: "#6c63d9",
  scheduled: "#8B5CF6",
  published: "#159a6f",
  failed: "#c8512a",
};
const PLATFORM_LABELS: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  vk: "VK",
};

// Цвета из CSS-переменных, обновляются при смене темы
function useThemeColors() {
  const [c, setC] = useState({
    accent: "#159a6f",
    track: "rgba(128,128,128,0.15)",
    axis: "#9CA3AF",
  });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setC({
        accent: cs.getPropertyValue("--accent").trim() || "#159a6f",
        track:
          cs.getPropertyValue("--track").trim() || "rgba(128,128,128,0.15)",
        axis: cs.getPropertyValue("--tx-3").trim() || "#9CA3AF",
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  return c;
}

const EMPTY_7 = Array.from({ length: 7 }, (_, i) => ({
  date: `${i + 1}`,
  count: 0,
}));
const EMPTY_30 = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}`,
  count: 0,
}));

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="ui-surface p-4">
    <p className="ui-label mb-4">{title}</p>
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
  const c = useThemeColors();

  const tooltipStyle = {
    fontSize: 12,
    border: "0.5px solid var(--line-strong)",
    borderRadius: 10,
    boxShadow: "none",
    background: "var(--panel)",
    color: "var(--tx-1)",
  };
  const EMPTY_PIE = [{ name: "—", value: 1, fill: c.track }];

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
                tick={{ fontSize: 10, fill: c.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: c.track }}
                contentStyle={tooltipStyle}
                formatter={(v: any) => [`${v}`, ""]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(days7.length > 0 ? days7 : EMPTY_7).map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? c.accent : c.track} />
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
                tick={{ fontSize: 9, fill: c.axis }}
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
                stroke={days30.some((d) => d.count > 0) ? c.accent : c.track}
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
                    <Cell key={i} fill={entry.fill || c.track} />
                  ),
                )}
              </Pie>
              {hasPlatforms && <Tooltip contentStyle={tooltipStyle} />}
              {hasPlatforms && (
                <Legend
                  iconSize={9}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "var(--tx-2)" }}
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
                tick={{ fontSize: 11, fill: c.axis }}
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
                      fill={hasTypes ? COLORS[i % COLORS.length] : c.track}
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
                    <Cell key={i} fill={entry.fill || c.track} />
                  ),
                )}
              </Pie>
              {hasStatuses && <Tooltip contentStyle={tooltipStyle} />}
              {hasStatuses && (
                <Legend
                  iconSize={9}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "var(--tx-2)" }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
